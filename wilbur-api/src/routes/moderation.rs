use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{get, post},
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
        .route("/ban", post(ban_user))
        .route("/unban", post(unban_user))
        .route("/kick", post(kick_user))
        .route("/mute", post(mute_user))
        .route("/log/:room_id", get(get_moderation_log))
        .route("/banned/:room_id", get(get_banned_users))
        .route("/report", post(create_report))
        .route("/report/:id/resolve", post(resolve_report))
}

#[derive(Debug, Deserialize)]
struct BanRequest {
    user_id: Uuid,
    room_id: Uuid,
    reason: Option<String>,
    duration_secs: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct UnbanRequest {
    user_id: Uuid,
    room_id: Uuid,
}

#[derive(Debug, Deserialize)]
struct KickRequest {
    user_id: Uuid,
    room_id: Uuid,
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MuteRequest {
    user_id: Uuid,
    room_id: Uuid,
    duration_secs: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct ReportRequest {
    room_id: Uuid,
    reported_user_id: Uuid,
    reason: String,
    message_id: Option<Uuid>,
}

/// POST /ban -- ban a user from a room.
async fn ban_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<BanRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "ban_user",
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "reason": body.reason,
        "duration_secs": body.duration_secs,
        "banned": true
    })))
}

/// POST /unban -- unban a user from a room.
async fn unban_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<UnbanRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "unban_user",
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "unbanned": true
    })))
}

/// POST /kick -- kick a user from a room.
async fn kick_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<KickRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "kick_user",
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "reason": body.reason,
        "kicked": true
    })))
}

/// POST /mute -- mute a user in a room.
async fn mute_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<MuteRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "mute_user",
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "duration_secs": body.duration_secs,
        "muted": true
    })))
}

/// GET /log/:room_id -- get the moderation log for a room.
async fn get_moderation_log(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_moderation_log",
        "room_id": room_id,
        "entries": []
    })))
}

/// GET /banned/:room_id -- get all banned users for a room.
async fn get_banned_users(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_banned_users",
        "room_id": room_id,
        "banned_users": []
    })))
}

/// POST /report -- report a user or message.
async fn create_report(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<ReportRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let report_id = Uuid::new_v4();

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": report_id,
            "reporter_id": auth_user.id,
            "room_id": body.room_id,
            "reported_user_id": body.reported_user_id,
            "reason": body.reason,
            "message_id": body.message_id,
            "status": "pending",
            "endpoint": "create_report"
        })),
    ))
}

/// POST /report/:id/resolve -- resolve a report.
async fn resolve_report(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    let resolution = body
        .get("resolution")
        .and_then(|r| r.as_str())
        .unwrap_or("resolved");

    Ok(Json(json!({
        "endpoint": "resolve_report",
        "report_id": id,
        "resolved_by": auth_user.id,
        "resolution": resolution,
        "status": "resolved"
    })))
}
