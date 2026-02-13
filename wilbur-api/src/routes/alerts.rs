use std::sync::Arc;

use axum::{
    extract::{Json, Multipart, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, pagination::PaginationParams},
    state::AppState,
    ws::manager::WsManager,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_alerts))
        .route("/", post(create_alert))
        .route("/:id", delete(delete_alert))
        .route("/:id/media", post(upload_alert_media))
}

#[derive(Debug, Serialize)]
struct AlertResponse {
    id: Uuid,
    room_id: Uuid,
    user_id: Uuid,
    title: String,
    body: Option<String>,
    media_url: Option<String>,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct CreateAlertRequest {
    title: String,
    body: Option<String>,
}

/// GET / -- list alerts for a room.
async fn list_alerts(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    // Stub: return placeholder response
    Ok(Json(json!({
        "endpoint": "list_alerts",
        "room_id": room_id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "data": []
    })))
}

/// POST / -- create a new alert in the room.
async fn create_alert(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateAlertRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let alert_id = Uuid::new_v4();

    let response = json!({
        "id": alert_id,
        "room_id": room_id,
        "user_id": auth_user.id,
        "title": body.title,
        "body": body.body,
        "endpoint": "create_alert"
    });

    // Broadcast to WebSocket channel
    let channel = format!("room:{}:alerts", room_id);
    WsManager::notify_change(&state, &channel, "alert_created", response.clone());

    Ok((StatusCode::CREATED, Json(response)))
}

/// DELETE /:id -- delete an alert.
async fn delete_alert(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    // Broadcast deletion to WebSocket channel
    let channel = format!("room:{}:alerts", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "alert_deleted",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// POST /:id/media -- upload media for an alert via multipart.
async fn upload_alert_media(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    mut multipart: Multipart,
) -> AppResult<Json<Value>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        if field.name() == Some("media") {
            let file_name = field
                .file_name()
                .unwrap_or("media.bin")
                .to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;

            let key = format!("alerts/{}/{}/{}", room_id, id, file_name);

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

            let media_url = format!("{}/{}/{}", state.config.s3_endpoint, state.config.s3_bucket, key);

            // Broadcast media update
            let channel = format!("room:{}:alerts", room_id);
            WsManager::notify_change(
                &state,
                &channel,
                "alert_media_uploaded",
                json!({ "id": id, "media_url": media_url }),
            );

            return Ok(Json(json!({ "media_url": media_url })));
        }
    }

    Err(AppError::BadRequest("No media field found in multipart body".into()))
}
