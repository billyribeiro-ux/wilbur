use std::sync::Arc;

use axum::{
    extract::{Json, Multipart, Path, Query, State},
    http::StatusCode,
    routing::{get, put},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    models::user::{UpdateUserRequest, User, UserResponse},
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/search", get(search_users))
        .route("/:id", get(get_user))
        .route("/:id", put(update_user))
        .route("/:id/avatar", put(upload_avatar))
        .route("/:id/profile", get(get_user_profile))
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
}

/// GET /:id -- get a user by ID.
async fn get_user(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<UserResponse>> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(UserResponse::from(user)))
}

/// PUT /:id -- update own user profile.
async fn update_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateUserRequest>,
) -> AppResult<Json<UserResponse>> {
    if auth_user.id != id {
        return Err(AppError::Forbidden("You can only update your own profile".into()));
    }

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET display_name = COALESCE($1, display_name),
            avatar_url   = COALESCE($2, avatar_url),
            updated_at   = NOW()
        WHERE id = $3
        RETURNING *
        "#,
    )
    .bind(&body.display_name)
    .bind(&body.avatar_url)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(UserResponse::from(user)))
}

/// PUT /:id/avatar -- upload an avatar image via multipart.
async fn upload_avatar(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<Json<Value>> {
    if auth_user.id != id {
        return Err(AppError::Forbidden("You can only update your own avatar".into()));
    }

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        if field.name() == Some("avatar") {
            let file_name = field
                .file_name()
                .unwrap_or("avatar.png")
                .to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;

            let key = format!("avatars/{}/{}", id, file_name);

            state
                .s3
                .put_object()
                .bucket(&state.config.s3_bucket)
                .key(&key)
                .body(data.into())
                .content_type(&content_type)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 upload failed: {e}")))?;

            let avatar_url = format!("{}/{}/{}", state.config.s3_endpoint, state.config.s3_bucket, key);

            sqlx::query("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2")
                .bind(&avatar_url)
                .bind(id)
                .execute(&state.pool)
                .await?;

            return Ok(Json(json!({ "avatar_url": avatar_url })));
        }
    }

    Err(AppError::BadRequest("No avatar field found in multipart body".into()))
}

/// GET /search?q= -- search users by display name or email.
async fn search_users(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Query(params): Query<SearchQuery>,
) -> AppResult<Json<Vec<UserResponse>>> {
    let query = params.q.unwrap_or_default();
    let pattern = format!("%{}%", query);

    let users = sqlx::query_as::<_, User>(
        r#"
        SELECT * FROM users
        WHERE display_name ILIKE $1 OR email ILIKE $1
        ORDER BY display_name ASC
        LIMIT 50
        "#,
    )
    .bind(&pattern)
    .fetch_all(&state.pool)
    .await?;

    let results: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();
    Ok(Json(results))
}

/// GET /:id/profile -- get public profile for a user.
async fn get_user_profile(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Return a public profile view (could include room memberships, etc.)
    let profile = json!({
        "user": UserResponse::from(user),
        "endpoint": "user_profile"
    });

    Ok(Json(profile))
}
