use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_themes))
        .route("/", post(create_theme))
        .route("/:id", get(get_theme))
        .route("/:id", put(update_theme))
        .route("/:id", delete(delete_theme))
}

#[derive(Debug, FromRow, Serialize)]
struct UserTheme {
    id: Uuid,
    user_id: Uuid,
    name: String,
    theme_data: Value,
    is_active: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct CreateThemeRequest {
    name: String,
    theme_data: Value,
    is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct UpdateThemeRequest {
    name: Option<String>,
    theme_data: Option<Value>,
    is_active: Option<bool>,
}

/// GET / -- list themes for the authenticated user.
async fn list_themes(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<Vec<UserTheme>>> {
    let themes = sqlx::query_as::<_, UserTheme>(
        "SELECT * FROM user_themes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(auth_user.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(themes))
}

/// POST / -- create a new theme.
async fn create_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateThemeRequest>,
) -> AppResult<(StatusCode, Json<UserTheme>)> {
    let theme_id = Uuid::new_v4();
    let now = Utc::now();

    let theme = sqlx::query_as::<_, UserTheme>(
        r#"
        INSERT INTO user_themes (id, user_id, name, theme_data, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(theme_id)
    .bind(auth_user.id)
    .bind(&body.name)
    .bind(&body.theme_data)
    .bind(body.is_active.unwrap_or(false))
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(theme)))
}

/// GET /:id -- get a specific theme (must be owned by the user).
async fn get_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<UserTheme>> {
    let theme = sqlx::query_as::<_, UserTheme>(
        "SELECT * FROM user_themes WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth_user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Theme not found".into()))?;

    Ok(Json(theme))
}

/// PUT /:id -- update a theme (must be owned by the user).
async fn update_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateThemeRequest>,
) -> AppResult<Json<UserTheme>> {
    let theme = sqlx::query_as::<_, UserTheme>(
        r#"
        UPDATE user_themes SET
            name       = COALESCE($1, name),
            theme_data = COALESCE($2, theme_data),
            is_active  = COALESCE($3, is_active),
            updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
        "#,
    )
    .bind(&body.name)
    .bind(&body.theme_data)
    .bind(body.is_active)
    .bind(id)
    .bind(auth_user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Theme not found".into()))?;

    Ok(Json(theme))
}

/// DELETE /:id -- delete a theme (must be owned by the user).
async fn delete_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let result = sqlx::query("DELETE FROM user_themes WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(auth_user.id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Theme not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}
