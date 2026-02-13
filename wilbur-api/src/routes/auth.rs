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

/// Generate a pair of JWT tokens (access + refresh) for the given user.
fn generate_tokens(user: &User, config: &crate::config::AppConfig) -> AppResult<(String, String)> {
    let now = Utc::now().timestamp();

    // Access token
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

    // Refresh token (longer expiry, same structure)
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

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /register -- create a new user account.
async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateUserRequest>,
) -> AppResult<(StatusCode, Json<AuthResponse>)> {
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

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, password_hash, display_name, role, tokens, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
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
    .fetch_one(&state.pool)
    .await?;

    // Generate JWT tokens
    let (access_token, refresh_token) = generate_tokens(&user, &state.config)?;

    // Store session
    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&refresh_token)
    .bind(now + chrono::Duration::seconds(state.config.jwt_refresh_token_expiry_secs))
    .bind(now)
    .execute(&state.pool)
    .await?;

    tracing::info!(user_id = %user.id, email = %user.email, "New user registered");

    let resp = build_auth_response(
        user,
        access_token,
        refresh_token,
        state.config.jwt_access_token_expiry_secs,
    );

    Ok((StatusCode::CREATED, Json(resp)))
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

    // Check email verification
    if user.email_verified_at.is_none() {
        return Err(AppError::Forbidden(
            "Please verify your email address before logging in".into(),
        ));
    }

    // Enforce single session -- remove previous sessions
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user.id)
        .execute(&state.pool)
        .await?;

    // Generate tokens
    let (access_token, refresh_token) = generate_tokens(&user, &state.config)?;
    let now = Utc::now();

    // Store new session
    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&refresh_token)
    .bind(now + chrono::Duration::seconds(state.config.jwt_refresh_token_expiry_secs))
    .bind(now)
    .execute(&state.pool)
    .await?;

    tracing::info!(user_id = %user.id, "User logged in");

    let resp = build_auth_response(
        user,
        access_token,
        refresh_token,
        state.config.jwt_access_token_expiry_secs,
    );

    Ok(Json(resp))
}

/// POST /logout -- invalidate the current session.
async fn logout(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<StatusCode> {
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(auth_user.id)
        .execute(&state.pool)
        .await?;

    tracing::info!(user_id = %auth_user.id, "User logged out");
    Ok(StatusCode::NO_CONTENT)
}

/// POST /refresh -- exchange a refresh token for new tokens.
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

    // Verify the session exists in the database
    let session_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW())",
    )
    .bind(user_id)
    .bind(&body.refresh_token)
    .fetch_one(&state.pool)
    .await?;

    if !session_exists {
        return Err(AppError::Unauthorized("Session expired or invalid".into()));
    }

    // Fetch user
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Rotate tokens
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user.id)
        .execute(&state.pool)
        .await?;

    let (access_token, refresh_token) = generate_tokens(&user, &state.config)?;
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(&refresh_token)
    .bind(now + chrono::Duration::seconds(state.config.jwt_refresh_token_expiry_secs))
    .bind(now)
    .execute(&state.pool)
    .await?;

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

    let result = sqlx::query(
        r#"
        UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
        WHERE id = (
            SELECT user_id FROM email_verifications
            WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
        )
        "#,
    )
    .bind(token)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest("Invalid or expired verification token".into()));
    }

    // Mark verification token as used
    sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE token = $1")
        .bind(token)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "message": "Email verified successfully" })))
}

/// POST /forgot-password -- send a password reset email.
async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ForgotPasswordRequest>,
) -> AppResult<Json<Value>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Always return success to avoid user enumeration
    let _user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(user) = _user {
        let reset_token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        sqlx::query(
            r#"
            INSERT INTO password_resets (id, user_id, token, expires_at, created_at)
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

    // Find valid reset token
    let user_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT user_id FROM password_resets
        WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
        "#,
    )
    .bind(&body.token)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::BadRequest("Invalid or expired reset token".into()))?;

    // Hash new password
    let password_hash = hash_password(&body.new_password)?;

    // Update password
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    // Mark token as used
    sqlx::query("UPDATE password_resets SET used_at = NOW() WHERE token = $1")
        .bind(&body.token)
        .execute(&state.pool)
        .await?;

    // Invalidate all sessions for this user
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&state.pool)
        .await?;

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

    // Invalidate all sessions so user must re-login
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(auth_user.id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "message": "Password changed successfully" })))
}
