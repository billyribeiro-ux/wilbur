use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, pagination::PaginationParams},
    models::poll::{CreatePollRequest, Poll, PollResponse, PollVote, VoteRequest},
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

/// GET / -- list polls for a room.
async fn list_polls(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    let limit = pagination.limit();
    let offset = pagination.offset();

    let polls = sqlx::query_as::<_, Poll>(
        r#"
        SELECT id, room_id, creator_id, question, options, status, closes_at, created_at
        FROM polls
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(room_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<PollResponse> = polls.into_iter().map(PollResponse::from).collect();

    Ok(Json(json!({
        "room_id": room_id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "data": data
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
    let options_json = serde_json::to_value(&body.options)
        .map_err(|e| AppError::Internal(format!("Failed to serialize options: {e}")))?;

    let poll = sqlx::query_as::<_, Poll>(
        r#"
        INSERT INTO polls (id, room_id, creator_id, question, options, status, closes_at, created_at)
        VALUES ($1, $2, $3, $4, $5, 'active'::poll_status, $6, NOW())
        RETURNING id, room_id, creator_id, question, options, status, closes_at, created_at
        "#,
    )
    .bind(poll_id)
    .bind(room_id)
    .bind(auth_user.id)
    .bind(&body.question)
    .bind(&options_json)
    .bind(body.closes_at)
    .fetch_one(&state.pool)
    .await?;

    let response = PollResponse::from(poll);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_created", response_json.clone());

    Ok((StatusCode::CREATED, Json(response_json)))
}

/// DELETE /:id -- delete a poll (only the creator can delete).
async fn delete_poll(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let result = sqlx::query(
        "DELETE FROM polls WHERE id = $1 AND room_id = $2 AND creator_id = $3",
    )
    .bind(id)
    .bind(room_id)
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(
            "Poll not found or you are not the creator".into(),
        ));
    }

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
    Json(body): Json<VoteRequest>,
) -> AppResult<Json<Value>> {
    let vote_id = Uuid::new_v4();

    let vote = sqlx::query_as::<_, PollVote>(
        r#"
        INSERT INTO poll_votes (id, poll_id, user_id, option_index, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (poll_id, user_id) DO UPDATE
            SET option_index = EXCLUDED.option_index,
                created_at = NOW()
        RETURNING id, poll_id, user_id, option_index, created_at
        "#,
    )
    .bind(vote_id)
    .bind(id)
    .bind(auth_user.id)
    .bind(body.option_index)
    .fetch_one(&state.pool)
    .await?;

    let response_json = serde_json::to_value(&vote)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_vote_cast", response_json.clone());

    Ok(Json(response_json))
}

/// GET /:id/votes -- get all votes for a poll.
async fn get_votes(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((_room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let votes = sqlx::query_as::<_, PollVote>(
        "SELECT id, poll_id, user_id, option_index, created_at FROM poll_votes WHERE poll_id = $1",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(json!({
        "poll_id": id,
        "votes": votes
    })))
}

/// POST /:id/close -- close a poll.
async fn close_poll(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE polls SET status = 'closed'::poll_status WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Poll not found".into()));
    }

    let response = json!({
        "poll_id": id,
        "room_id": room_id,
        "status": "closed"
    });

    let channel = format!("room:{}:polls", room_id);
    WsManager::notify_change(&state, &channel, "poll_closed", response.clone());

    Ok(Json(response))
}
