use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::{
        auth::AuthUser,
        room_access::{require_room_member, require_room_moderator},
    },
    models::moderation::{
        BannedUser, BannedUserResponse, ModerationLog, ModerationLogResponse,
        ReportedContent, ReportedContentResponse,
    },
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
/// Uses a transaction: INSERT into banned_users + UPDATE room_memberships + INSERT into moderation_log.
async fn ban_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<BanRequest>,
) -> AppResult<Json<Value>> {
    // Only host or moderator can ban users
    require_room_moderator(&state.pool, auth_user.id, body.room_id).await?;

    let mut tx = state.pool.begin().await?;

    let expires_at = body.duration_secs.map(|secs| {
        chrono::Utc::now() + chrono::Duration::seconds(secs)
    });

    // Insert into banned_users
    let ban = sqlx::query_as::<_, BannedUser>(
        r#"
        INSERT INTO banned_users (id, room_id, user_id, banned_by, reason, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (room_id, user_id) DO UPDATE
            SET banned_by = EXCLUDED.banned_by,
                reason = EXCLUDED.reason,
                expires_at = EXCLUDED.expires_at,
                created_at = NOW()
        RETURNING id, room_id, user_id, banned_by, reason, expires_at, created_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(body.room_id)
    .bind(body.user_id)
    .bind(auth_user.id)
    .bind(&body.reason)
    .bind(expires_at)
    .fetch_one(&mut *tx)
    .await?;

    // Update room_memberships status to banned
    sqlx::query(
        "UPDATE room_memberships SET status = 'banned'::member_status, updated_at = NOW() WHERE user_id = $1 AND room_id = $2",
    )
    .bind(body.user_id)
    .bind(body.room_id)
    .execute(&mut *tx)
    .await?;

    // Insert into moderation_log
    sqlx::query(
        r#"
        INSERT INTO moderation_log (id, room_id, moderator_id, target_user_id, action, details, created_at)
        VALUES ($1, $2, $3, $4, 'ban', $5, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(body.room_id)
    .bind(auth_user.id)
    .bind(body.user_id)
    .bind(&body.reason)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let response = BannedUserResponse::from(ban);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    Ok(Json(response_json))
}

/// POST /unban -- unban a user from a room.
/// Uses a transaction: DELETE from banned_users + UPDATE room_memberships + INSERT into moderation_log.
async fn unban_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<UnbanRequest>,
) -> AppResult<Json<Value>> {
    // Only host or moderator can unban users
    require_room_moderator(&state.pool, auth_user.id, body.room_id).await?;

    let mut tx = state.pool.begin().await?;

    // Delete from banned_users
    let result = sqlx::query(
        "DELETE FROM banned_users WHERE user_id = $1 AND room_id = $2",
    )
    .bind(body.user_id)
    .bind(body.room_id)
    .execute(&mut *tx)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("User is not banned in this room".into()));
    }

    // Update room_memberships status back to active
    sqlx::query(
        "UPDATE room_memberships SET status = 'active'::member_status, updated_at = NOW() WHERE user_id = $1 AND room_id = $2",
    )
    .bind(body.user_id)
    .bind(body.room_id)
    .execute(&mut *tx)
    .await?;

    // Insert into moderation_log
    sqlx::query(
        r#"
        INSERT INTO moderation_log (id, room_id, moderator_id, target_user_id, action, details, created_at)
        VALUES ($1, $2, $3, $4, 'unban', NULL, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(body.room_id)
    .bind(auth_user.id)
    .bind(body.user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "unbanned": true
    })))
}

/// POST /kick -- kick a user from a room.
/// DELETE from room_memberships + INSERT into moderation_log.
async fn kick_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<KickRequest>,
) -> AppResult<Json<Value>> {
    // Only host or moderator can kick users
    require_room_moderator(&state.pool, auth_user.id, body.room_id).await?;

    let mut tx = state.pool.begin().await?;

    // Delete from room_memberships
    let result = sqlx::query(
        "DELETE FROM room_memberships WHERE user_id = $1 AND room_id = $2",
    )
    .bind(body.user_id)
    .bind(body.room_id)
    .execute(&mut *tx)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("User is not a member of this room".into()));
    }

    // Insert into moderation_log
    sqlx::query(
        r#"
        INSERT INTO moderation_log (id, room_id, moderator_id, target_user_id, action, details, created_at)
        VALUES ($1, $2, $3, $4, 'kick', $5, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(body.room_id)
    .bind(auth_user.id)
    .bind(body.user_id)
    .bind(&body.reason)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({
        "moderator_id": auth_user.id,
        "user_id": body.user_id,
        "room_id": body.room_id,
        "reason": body.reason,
        "kicked": true
    })))
}

/// POST /mute -- mute a user in a room.
/// INSERT into moderation_log with action = 'mute'.
async fn mute_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<MuteRequest>,
) -> AppResult<Json<Value>> {
    // Only host or moderator can mute users
    require_room_moderator(&state.pool, auth_user.id, body.room_id).await?;

    let details = body.duration_secs.map(|s| format!("duration_secs: {}", s));

    sqlx::query(
        r#"
        INSERT INTO moderation_log (id, room_id, moderator_id, target_user_id, action, details, created_at)
        VALUES ($1, $2, $3, $4, 'mute', $5, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(body.room_id)
    .bind(auth_user.id)
    .bind(body.user_id)
    .bind(&details)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({
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
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    // Verify the user is a member of the room
    require_room_member(&state.pool, auth_user.id, room_id).await?;

    let entries = sqlx::query_as::<_, ModerationLog>(
        r#"
        SELECT id, room_id, moderator_id, target_user_id, action, details, created_at
        FROM moderation_log
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT 100
        "#,
    )
    .bind(room_id)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<ModerationLogResponse> =
        entries.into_iter().map(ModerationLogResponse::from).collect();

    Ok(Json(json!({
        "room_id": room_id,
        "entries": data
    })))
}

/// GET /banned/:room_id -- get all banned users for a room.
async fn get_banned_users(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    // Verify the user is a member of the room
    require_room_member(&state.pool, auth_user.id, room_id).await?;

    let bans = sqlx::query_as::<_, BannedUser>(
        r#"
        SELECT id, room_id, user_id, banned_by, reason, expires_at, created_at
        FROM banned_users
        WHERE room_id = $1
        "#,
    )
    .bind(room_id)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<BannedUserResponse> = bans.into_iter().map(BannedUserResponse::from).collect();

    Ok(Json(json!({
        "room_id": room_id,
        "banned_users": data
    })))
}

/// POST /report -- report a user or message.
async fn create_report(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<ReportRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let report_id = Uuid::new_v4();

    // Determine content_type and content_id based on whether message_id is provided
    let (content_type, content_id) = match body.message_id {
        Some(msg_id) => ("message".to_string(), msg_id),
        None => ("user".to_string(), body.reported_user_id),
    };

    let report = sqlx::query_as::<_, ReportedContent>(
        r#"
        INSERT INTO reported_content (id, room_id, reporter_id, content_type, content_id, reason, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending'::report_status, NOW())
        RETURNING id, room_id, reporter_id, content_type, content_id, reason, status, reviewed_by, created_at
        "#,
    )
    .bind(report_id)
    .bind(body.room_id)
    .bind(auth_user.id)
    .bind(&content_type)
    .bind(content_id)
    .bind(&body.reason)
    .fetch_one(&state.pool)
    .await?;

    let response = ReportedContentResponse::from(report);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    Ok((StatusCode::CREATED, Json(response_json)))
}

/// POST /report/:id/resolve -- resolve a report.
async fn resolve_report(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    // Only admin can resolve reports
    if auth_user.role != "admin" {
        return Err(AppError::Forbidden("Only admins can resolve reports".into()));
    }

    let status_str = body
        .get("status")
        .and_then(|s| s.as_str())
        .unwrap_or("reviewed");

    let report = sqlx::query_as::<_, ReportedContent>(
        r#"
        UPDATE reported_content
        SET status = $1::report_status,
            reviewed_by = $2
        WHERE id = $3
        RETURNING id, room_id, reporter_id, content_type, content_id, reason, status, reviewed_by, created_at
        "#,
    )
    .bind(status_str)
    .bind(auth_user.id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Report not found".into()))?;

    let response = ReportedContentResponse::from(report);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    Ok(Json(response_json))
}
