use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
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
        .route("/", get(list_polls))
        .route("/", post(create_poll))
        .route("/:id", delete(delete_poll))
        .route("/:id/vote", post(cast_vote))
        .route("/:id/votes", get(get_votes))
        .route("/:id/close", post(close_poll))
}

#[derive(Debug, Deserialize)]
struct CreatePollRequest {
    question: String,
    options: Vec<String>,
    /// Duration in seconds before the poll auto-closes; None = open until manually closed.
    duration_secs: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CastVoteRequest {
    option_index: usize,
}

#[derive(Debug, Serialize)]
struct PollResponse {
    id: Uuid,
    room_id: Uuid,
    user_id: Uuid,
    question: String,
    options: Vec<String>,
    is_closed: bool,
    endpoint: String,
}

/// GET / -- list polls for a room.
async fn list_polls(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_polls",
        "room_id": room_id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "data": []
    })))
}

/// POST / -- create a new poll.
async fn create_poll(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreatePollRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let poll_id = Uuid::new_v4();

    let response = json!({
        "id": poll_id,
        "room_id": room_id,
        "user_id": auth_user.id,
        "question": body.question,
        "options": body.options,
        "duration_secs": body.duration_secs,
        "is_closed": false,
        "endpoint": "create_poll"
    });

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_created", response.clone());

    Ok((StatusCode::CREATED, Json(response)))
}

/// DELETE /:id -- delete a poll.
async fn delete_poll(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "poll_deleted",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// POST /:id/vote -- cast a vote on a poll.
async fn cast_vote(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<CastVoteRequest>,
) -> AppResult<Json<Value>> {
    let response = json!({
        "poll_id": id,
        "room_id": room_id,
        "user_id": auth_user.id,
        "option_index": body.option_index,
        "endpoint": "cast_vote"
    });

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_vote_cast", response.clone());

    Ok(Json(response))
}

/// GET /:id/votes -- get all votes for a poll.
async fn get_votes(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_votes",
        "poll_id": id,
        "room_id": room_id,
        "votes": []
    })))
}

/// POST /:id/close -- close a poll.
async fn close_poll(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let response = json!({
        "poll_id": id,
        "room_id": room_id,
        "is_closed": true,
        "endpoint": "close_poll"
    });

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_closed", response.clone());

    Ok(Json(response))
}
