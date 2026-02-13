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
    ws::manager::WsManager,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_tracks))
        .route("/", post(create_track))
        .route("/heartbeat", post(heartbeat))
        .route("/cleanup", post(cleanup))
        .route("/:id", put(update_track))
        .route("/:id", delete(delete_track))
}

#[derive(Debug, Deserialize)]
struct CreateTrackRequest {
    track_type: String,
    track_sid: Option<String>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct UpdateTrackRequest {
    muted: Option<bool>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct HeartbeatRequest {
    track_ids: Vec<Uuid>,
}

/// GET / -- list active media tracks for a room.
async fn list_tracks(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_media_tracks",
        "room_id": room_id,
        "tracks": []
    })))
}

/// POST / -- register a new media track in the room.
async fn create_track(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateTrackRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let track_id = Uuid::new_v4();

    let response = json!({
        "id": track_id,
        "room_id": room_id,
        "user_id": auth_user.id,
        "track_type": body.track_type,
        "track_sid": body.track_sid,
        "metadata": body.metadata,
        "endpoint": "create_media_track"
    });

    let channel = format!("room:{}:tracks", room_id);
    WsManager::notify_change(&state, &channel, "track_added", response.clone());

    Ok((StatusCode::CREATED, Json(response)))
}

/// PUT /:id -- update a media track.
async fn update_track(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateTrackRequest>,
) -> AppResult<Json<Value>> {
    let response = json!({
        "endpoint": "update_media_track",
        "track_id": id,
        "room_id": room_id,
        "user_id": auth_user.id,
        "muted": body.muted,
        "metadata": body.metadata
    });

    let channel = format!("room:{}:tracks", room_id);
    WsManager::notify_change(&state, &channel, "track_updated", response.clone());

    Ok(Json(response))
}

/// DELETE /:id -- remove a media track.
async fn delete_track(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let channel = format!("room:{}:tracks", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "track_removed",
        json!({ "id": id, "room_id": room_id, "user_id": auth_user.id }),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// POST /heartbeat -- send heartbeat for active tracks to prevent cleanup.
async fn heartbeat(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<HeartbeatRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "media_track_heartbeat",
        "room_id": room_id,
        "user_id": auth_user.id,
        "track_count": body.track_ids.len(),
        "acknowledged": true
    })))
}

/// POST /cleanup -- remove stale tracks (called by background job or admin).
async fn cleanup(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "media_track_cleanup",
        "room_id": room_id,
        "removed_count": 0
    })))
}
