use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    models::media_track::{MediaTrack, MediaTrackResponse},
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
    track_id: Option<String>,
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
    let tracks = sqlx::query_as::<_, MediaTrack>(
        "SELECT * FROM media_tracks WHERE room_id = $1 AND is_active = true",
    )
    .bind(room_id)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<MediaTrackResponse> = tracks.into_iter().map(MediaTrackResponse::from).collect();

    Ok(Json(json!({
        "room_id": room_id,
        "tracks": data
    })))
}

/// POST / -- register a new media track in the room.
async fn create_track(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateTrackRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let track_uuid = Uuid::new_v4();
    let track_id_str = body.track_id.unwrap_or_else(|| track_uuid.to_string());

    let track = sqlx::query_as::<_, MediaTrack>(
        r#"
        INSERT INTO media_tracks (id, room_id, user_id, track_id, track_type, is_active, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::track_type, true, $6, NOW(), NOW())
        RETURNING *
        "#,
    )
    .bind(track_uuid)
    .bind(room_id)
    .bind(auth_user.id)
    .bind(&track_id_str)
    .bind(&body.track_type)
    .bind(&body.metadata)
    .fetch_one(&state.pool)
    .await?;

    let response = MediaTrackResponse::from(track);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    let channel = format!("room:{}:tracks", room_id);
    WsManager::notify_change(&state, &channel, "track_added", response_json.clone());

    Ok((StatusCode::CREATED, Json(response_json)))
}

/// PUT /:id -- update a media track (metadata and/or muted state).
async fn update_track(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateTrackRequest>,
) -> AppResult<Json<Value>> {
    let new_metadata = body.metadata.as_ref();

    let track = sqlx::query_as::<_, MediaTrack>(
        r#"
        UPDATE media_tracks
        SET metadata = COALESCE($1, metadata),
            muted = COALESCE($2, muted),
            updated_at = NOW()
        WHERE id = $3 AND room_id = $4
        RETURNING *
        "#,
    )
    .bind(&new_metadata)
    .bind(body.muted)
    .bind(id)
    .bind(room_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Media track not found".into()))?;

    let response = MediaTrackResponse::from(track);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    let channel = format!("room:{}:tracks", room_id);
    WsManager::notify_change(&state, &channel, "track_updated", response_json.clone());

    Ok(Json(response_json))
}

/// DELETE /:id -- remove a media track (soft-delete).
async fn delete_track(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let result = sqlx::query(
        "UPDATE media_tracks SET is_active = false, updated_at = NOW() WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Media track not found".into()));
    }

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
    let result = sqlx::query(
        "UPDATE media_tracks SET last_heartbeat = NOW(), updated_at = NOW() WHERE id = ANY($1) AND user_id = $2",
    )
    .bind(&body.track_ids)
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({
        "room_id": room_id,
        "user_id": auth_user.id,
        "track_count": body.track_ids.len(),
        "updated_count": result.rows_affected(),
        "acknowledged": true
    })))
}

/// POST /cleanup -- remove stale tracks (called by background job or admin).
async fn cleanup(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        r#"
        UPDATE media_tracks
        SET is_active = false, updated_at = NOW()
        WHERE room_id = $1 AND is_active = true AND last_heartbeat < NOW() - INTERVAL '5 minutes'
        "#,
    )
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    let removed_count = result.rows_affected();

    if removed_count > 0 {
        let channel = format!("room:{}:tracks", room_id);
        WsManager::notify_change(
            &state,
            &channel,
            "tracks_cleaned_up",
            json!({ "room_id": room_id, "removed_count": removed_count }),
        );
    }

    Ok(Json(json!({
        "room_id": room_id,
        "removed_count": removed_count
    })))
}
