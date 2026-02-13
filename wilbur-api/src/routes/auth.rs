use std::sync::Arc;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Json, State},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::{AuthUser, Claims},
    models::{
        auth::{
            AuthResponse, ChangePasswordRequest, ForgotPasswordRequest, LoginRequest,
            RefreshRequest, ResetPasswordRequest,
        },
        user::{CreateUserRequest, User, UserResponse, UserRole},
    },
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/logout", post(logout))
        .route("/refresh", post(refresh))
        .route("/verify-email", post(verify_email))
        .route("/forgot-password", post(forgot_password))
        .route("/reset-password", post(reset_password))
        .route("/me", get(me))
        .route("/change-password", post(change_password))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Hash a plain-text password with Argon2id.
fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {e}")))
}

/// Verify a plain-text password against a stored Argon2 hash.
fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Invalid password hash in database: {e}")))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

/// SHA-256 hash a token for secure storage. Never store raw tokens.
fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Generate a pair of JWT tokens (access + refresh) for the given user.
fn generate_tokens(user: &User, config: &crate::config::AppConfig) -> AppResult<(String, String)> {
    let now = Utc::now().timestamp();

    // Access token (short-lived)
    let access_claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: format!("{:?}", user.role).to_lowercase(),
        iat: now,
        exp: now + config.jwt_access_token_expiry_secs,
    };
    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encoding failed: {e}")))?;

    // Refresh token (longer-lived)
    let refresh_claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        role: format!("{:?}", user.role).to_lowercase(),
        iat: now,
        exp: now + config.jwt_refresh_token_expiry_secs,
    };
    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encoding failed: {e}")))?;

    Ok((access_token, refresh_token))
}

/// Build an `AuthResponse` from a user and token pair.
fn build_auth_response(
    user: User,
    access_token: String,
    refresh_token: String,
    expires_in: i64,
) -> AuthResponse {
    AuthResponse {
        access_token,
        refresh_token,
        expires_in,
        user: UserResponse::from(user),
    }
}

/// Store a hashed refresh token in the `refresh_tokens` table.
async fn store_refresh_token(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    raw_token: &str,
    expiry_secs: i64,
) -> AppResult<()> {
    let token_hash = hash_token(raw_token);
    let now = Utc::now();
    let expires_at = now + chrono::Duration::seconds(expiry_secs);

    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
        VALUES ($1, $2, $3, $4, false, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&token_hash)
    .bind(expires_at)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

/// Revoke all refresh tokens for a user.
async fn revoke_all_refresh_tokens(pool: &sqlx::PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false")
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Invalidate all sessions and refresh tokens for a user.
async fn invalidate_all_user_tokens(pool: &sqlx::PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;
    revoke_all_refresh_tokens(pool, user_id).await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /register -- create a new user account.
/// Returns user info with a message to verify email. Does NOT issue tokens.
async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateUserRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Check for duplicate email
    let existing = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1))",
    )
    .bind(&body.email)
    .fetch_one(&state.pool)
    .await?;

    if existing {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    // Hash password
    let password_hash = hash_password(&body.password)?;
    let user_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, display_name, role, tokens, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.display_name)
    .bind(UserRole::Member)
    .bind(0i32)
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await?;

    // Generate email verification token
    let verification_token = Uuid::new_v4().to_string();
    let verification_expires = now + chrono::Duration::hours(24);

    sqlx::query(
        r#"
        INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&verification_token)
    .bind(verification_expires)
    .bind(now)
    .execute(&state.pool)
    .await?;

    // TODO: Send verification email via email service
    tracing::info!(user_id = %user_id, email = %body.email, "New user registered — verification email pending");

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "message": "Account created. Please check your email to verify your address before logging in.",
            "user_id": user_id
        })),
    ))
}

/// POST /login -- authenticate and return tokens.
async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Find user by email
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid email or password".into()))?;

    // Verify password
    if !verify_password(&body.password, &user.password_hash)? {
        return Err(AppError::Unauthorized("Invalid email or password".into()));
    }

    // Require email verification
    if user.email_verified_at.is_none() {
        return Err(AppError::Forbidden(
            "Please verify your email address before logging in".into(),
        ));
    }

    // Enforce single session — revoke previous sessions and refresh tokens
    invalidate_all_user_tokens(&state.pool, user.id).await?;

    // Generate tokens
    let (access_token, refresh_token) = generate_tokens(&user, &state.config)?;
    let now = Utc::now();

    // Store session with hashed token
    let session_token_hash = hash_token(&access_token);
    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&session_token_hash)
    .bind(now + chrono::Duration::seconds(state.config.jwt_access_token_expiry_secs))
    .bind(now)
    .execute(&state.pool)
    .await?;

    // Store refresh token (hashed)
    store_refresh_token(&state.pool, user.id, &refresh_token, state.config.jwt_refresh_token_expiry_secs).await?;

    tracing::info!(user_id = %user.id, "User logged in");

    let resp = build_auth_response(
        user,
        access_token,
        refresh_token,
        state.config.jwt_access_token_expiry_secs,
    );

    Ok(Json(resp))
}

/// POST /logout -- invalidate the current session and all refresh tokens.
async fn logout(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<StatusCode> {
    invalidate_all_user_tokens(&state.pool, auth_user.id).await?;

    tracing::info!(user_id = %auth_user.id, "User logged out");
    Ok(StatusCode::NO_CONTENT)
}

/// POST /refresh -- exchange a refresh token for new tokens (token rotation).
async fn refresh(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RefreshRequest>,
) -> AppResult<Json<AuthResponse>> {
    // Decode the refresh token to get claims
    let token_data = jsonwebtoken::decode::<Claims>(
        &body.refresh_token,
        &jsonwebtoken::DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid refresh token: {e}")))?;

    let user_id = token_data.claims.sub;
    let token_hash = hash_token(&body.refresh_token);

    // Verify the refresh token exists, is not revoked, and has not expired
    let token_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND revoked = false AND expires_at > NOW())",
    )
    .bind(user_id)
    .bind(&token_hash)
    .fetch_one(&state.pool)
    .await?;

    if !token_exists {
        // Possible token reuse attack — revoke all tokens for safety
        invalidate_all_user_tokens(&state.pool, user_id).await?;
        tracing::warn!(user_id = %user_id, "Refresh token reuse detected — all tokens revoked");
        return Err(AppError::Unauthorized("Session expired or invalid. Please log in again.".into()));
    }

    // Revoke the used refresh token (rotation)
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND token_hash = $2")
        .bind(user_id)
        .bind(&token_hash)
        .execute(&state.pool)
        .await?;

    // Fetch user
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Generate new tokens
    let (access_token, refresh_token) = generate_tokens(&user, &state.config)?;
    let now = Utc::now();

    // Replace session
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user.id)
        .execute(&state.pool)
        .await?;

    let session_token_hash = hash_token(&access_token);
    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&session_token_hash)
    .bind(now + chrono::Duration::seconds(state.config.jwt_access_token_expiry_secs))
    .bind(now)
    .execute(&state.pool)
    .await?;

    // Store new refresh token (hashed)
    store_refresh_token(&state.pool, user.id, &refresh_token, state.config.jwt_refresh_token_expiry_secs).await?;

    let resp = build_auth_response(
        user,
        access_token,
        refresh_token,
        state.config.jwt_access_token_expiry_secs,
    );

    Ok(Json(resp))
}

/// POST /verify-email -- verify a user's email with a token.
async fn verify_email(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    let token = body
        .get("token")
        .and_then(|t| t.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing token field".into()))?;

    // Find valid verification token and update user in a transaction
    let mut tx = state.pool.begin().await?;

    let user_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT user_id FROM email_verification_tokens
        WHERE token = $1 AND expires_at > NOW()
        "#,
    )
    .bind(token)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::BadRequest("Invalid or expired verification token".into()))?;

    // Mark user as verified
    sqlx::query("UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Delete used verification token (clean up)
    sqlx::query("DELETE FROM email_verification_tokens WHERE token = $1")
        .bind(token)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(Json(json!({ "message": "Email verified successfully" })))
}

/// POST /forgot-password -- send a password reset email.
async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ForgotPasswordRequest>,
) -> AppResult<Json<Value>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Always return success to prevent user enumeration
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(user) = user {
        let reset_token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        sqlx::query(
            r#"
            INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user.id)
        .bind(&reset_token)
        .bind(expires_at)
        .execute(&state.pool)
        .await?;

        // TODO: Send reset email via email service
        tracing::info!(user_id = %user.id, "Password reset requested");
    }

    Ok(Json(json!({
        "message": "If an account with that email exists, a reset link has been sent"
    })))
}

/// POST /reset-password -- reset password using a token.
async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ResetPasswordRequest>,
) -> AppResult<Json<Value>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let mut tx = state.pool.begin().await?;

    // Find valid reset token
    let user_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT user_id FROM password_reset_tokens
        WHERE token = $1 AND expires_at > NOW()
        "#,
    )
    .bind(&body.token)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::BadRequest("Invalid or expired reset token".into()))?;

    // Hash new password
    let password_hash = hash_password(&body.new_password)?;

    // Update password
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    // Delete used reset token
    sqlx::query("DELETE FROM password_reset_tokens WHERE token = $1")
        .bind(&body.token)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    // Invalidate all sessions and refresh tokens (force re-login)
    invalidate_all_user_tokens(&state.pool, user_id).await?;

    Ok(Json(json!({ "message": "Password reset successfully" })))
}

/// GET /me -- return the authenticated user's profile.
async fn me(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(auth_user.id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(UserResponse::from(user)))
}

/// POST /change-password -- change password while authenticated.
async fn change_password(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<ChangePasswordRequest>,
) -> AppResult<Json<Value>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Fetch current user
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(auth_user.id)
        .fetch_one(&state.pool)
        .await?;

    // Verify current password
    if !verify_password(&body.current_password, &user.password_hash)? {
        return Err(AppError::BadRequest("Current password is incorrect".into()));
    }

    // Hash new password
    let new_hash = hash_password(&body.new_password)?;

    // Update
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&new_hash)
        .bind(auth_user.id)
        .execute(&state.pool)
        .await?;

    // Invalidate all sessions AND refresh tokens so user must re-login
    invalidate_all_user_tokens(&state.pool, auth_user.id).await?;

    Ok(Json(json!({ "message": "Password changed successfully" })))
}
