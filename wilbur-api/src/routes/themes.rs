use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
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

#[derive(Debug, Deserialize)]
struct CreateThemeRequest {
    name: String,
    primary_color: Option<String>,
    secondary_color: Option<String>,
    background_color: Option<String>,
    text_color: Option<String>,
    font_family: Option<String>,
    border_radius: Option<String>,
    custom_css: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateThemeRequest {
    name: Option<String>,
    primary_color: Option<String>,
    secondary_color: Option<String>,
    background_color: Option<String>,
    text_color: Option<String>,
    font_family: Option<String>,
    border_radius: Option<String>,
    custom_css: Option<String>,
}

/// GET / -- list themes for the authenticated user.
async fn list_themes(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_themes",
        "user_id": auth_user.id,
        "themes": []
    })))
}

/// POST / -- create a new theme.
async fn create_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateThemeRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let theme_id = Uuid::new_v4();

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": theme_id,
            "user_id": auth_user.id,
            "name": body.name,
            "primary_color": body.primary_color,
            "secondary_color": body.secondary_color,
            "background_color": body.background_color,
            "text_color": body.text_color,
            "font_family": body.font_family,
            "border_radius": body.border_radius,
            "custom_css": body.custom_css,
            "endpoint": "create_theme"
        })),
    ))
}

/// GET /:id -- get a specific theme.
async fn get_theme(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_theme",
        "theme_id": id
    })))
}

/// PUT /:id -- update a theme.
async fn update_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateThemeRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "update_theme",
        "theme_id": id,
        "user_id": auth_user.id,
        "name": body.name,
        "primary_color": body.primary_color,
        "secondary_color": body.secondary_color,
        "background_color": body.background_color,
        "text_color": body.text_color,
        "font_family": body.font_family,
        "border_radius": body.border_radius,
        "custom_css": body.custom_css
    })))
}

/// DELETE /:id -- delete a theme.
async fn delete_theme(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    Ok(StatusCode::NO_CONTENT)
}
