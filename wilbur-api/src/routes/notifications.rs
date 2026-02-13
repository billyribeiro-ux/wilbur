use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_notifications))
        .route("/read-all", post(read_all_notifications))
        .route("/:id/read", post(mark_read))
        .route("/:id", delete(delete_notification))
}

/// GET / -- list notifications for the authenticated user.
async fn list_notifications(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_notifications",
        "user_id": auth_user.id,
        "notifications": []
    })))
}

/// POST /:id/read -- mark a notification as read.
async fn mark_read(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "mark_notification_read",
        "notification_id": id,
        "user_id": auth_user.id,
        "read": true
    })))
}

/// DELETE /:id -- delete a notification.
async fn delete_notification(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    Ok(StatusCode::NO_CONTENT)
}

/// POST /read-all -- mark all notifications as read for the current user.
async fn read_all_notifications(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "read_all_notifications",
        "user_id": auth_user.id,
        "read_all": true
    })))
}
