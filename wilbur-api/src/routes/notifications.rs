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
    models::notification::{Notification, NotificationResponse},
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
    let notifications = sqlx::query_as::<_, Notification>(
        r#"
        SELECT id, user_id, title, body, notification_type, is_read, data, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        "#,
    )
    .bind(auth_user.id)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<NotificationResponse> = notifications
        .into_iter()
        .map(NotificationResponse::from)
        .collect();

    Ok(Json(json!({
        "user_id": auth_user.id,
        "notifications": data
    })))
}

/// POST /:id/read -- mark a notification as read.
async fn mark_read(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Notification not found".into()));
    }

    Ok(Json(json!({
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
    let result = sqlx::query(
        "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Notification not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// POST /read-all -- mark all notifications as read for the current user.
async fn read_all_notifications(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
    )
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({
        "user_id": auth_user.id,
        "read_all": true,
        "updated_count": result.rows_affected()
    })))
}
