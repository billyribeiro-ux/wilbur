use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use serde_json::{json, Value};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, pagination::PaginationParams},
    models::message::{
        ChatMessage, ChatMessageWithUser, CreateMessageRequest, MessageResponse, UpdateMessageRequest,
    },
    state::AppState,
    ws::manager::WsManager,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_messages))
        .route("/", post(create_message))
        .route("/:id", put(update_message))
        .route("/:id", delete(delete_message))
        .route("/:id/pin", post(pin_message))
        .route("/:id/unpin", post(unpin_message))
        .route("/:id/off-topic", post(mark_off_topic))
}

/// GET / -- list messages for a room (paginated). Room ID comes from the nested path.
async fn list_messages(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Vec<MessageResponse>>> {
    let messages = sqlx::query_as::<_, ChatMessageWithUser>(
        r#"
        SELECT m.*, u.display_name, u.avatar_url
        FROM chat_messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.room_id = $1 AND m.is_deleted = false
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(room_id)
    .bind(pagination.limit())
    .bind(pagination.offset())
    .fetch_all(&state.pool)
    .await?;

    let results: Vec<MessageResponse> = messages.into_iter().map(MessageResponse::from).collect();
    Ok(Json(results))
}

/// POST / -- create a new message in the room.
async fn create_message(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateMessageRequest>,
) -> AppResult<(StatusCode, Json<MessageResponse>)> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let content_type = body.content_type.unwrap_or(crate::models::message::ContentType::Text);
    let msg_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let message = sqlx::query_as::<_, ChatMessageWithUser>(
        r#"
        WITH inserted AS (
            INSERT INTO chat_messages (id, room_id, user_id, content, content_type, is_pinned, is_off_topic, is_deleted, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, false, false, false, $6, $7)
            RETURNING *
        )
        SELECT i.*, u.display_name, u.avatar_url
        FROM inserted i
        JOIN users u ON u.id = i.user_id
        "#,
    )
    .bind(msg_id)
    .bind(room_id)
    .bind(auth_user.id)
    .bind(&body.content)
    .bind(&content_type)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    let response = MessageResponse::from(message);

    // Broadcast to WebSocket channel
    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_created",
        serde_json::to_value(&response).unwrap_or_default(),
    );

    Ok((StatusCode::CREATED, Json(response)))
}

/// PUT /:id -- update a message.
async fn update_message(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateMessageRequest>,
) -> AppResult<Json<MessageResponse>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let message = sqlx::query_as::<_, ChatMessageWithUser>(
        r#"
        WITH updated AS (
            UPDATE chat_messages SET
                content    = COALESCE($1, content),
                is_pinned  = COALESCE($2, is_pinned),
                is_off_topic = COALESCE($3, is_off_topic),
                updated_at = NOW()
            WHERE id = $4 AND room_id = $5 AND user_id = $6 AND is_deleted = false
            RETURNING *
        )
        SELECT u2.*, usr.display_name, usr.avatar_url
        FROM updated u2
        JOIN users usr ON usr.id = u2.user_id
        "#,
    )
    .bind(&body.content)
    .bind(body.is_pinned)
    .bind(body.is_off_topic)
    .bind(id)
    .bind(room_id)
    .bind(auth_user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Message not found or not owned by you".into()))?;

    let response = MessageResponse::from(message);

    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_updated",
        serde_json::to_value(&response).unwrap_or_default(),
    );

    Ok(Json(response))
}

/// DELETE /:id -- soft-delete a message.
async fn delete_message(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let result = sqlx::query(
        r#"
        UPDATE chat_messages SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND room_id = $2 AND user_id = $3
        "#,
    )
    .bind(id)
    .bind(room_id)
    .bind(auth_user.id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Message not found or not owned by you".into()));
    }

    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_deleted",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// POST /:id/pin -- pin a message.
async fn pin_message(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE chat_messages SET is_pinned = true, updated_at = NOW() WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Message not found".into()));
    }

    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_pinned",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(Json(json!({ "message": "Message pinned" })))
}

/// POST /:id/unpin -- unpin a message.
async fn unpin_message(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE chat_messages SET is_pinned = false, updated_at = NOW() WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Message not found".into()));
    }

    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_unpinned",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(Json(json!({ "message": "Message unpinned" })))
}

/// POST /:id/off-topic -- mark a message as off-topic.
async fn mark_off_topic(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<Value>> {
    let result = sqlx::query(
        "UPDATE chat_messages SET is_off_topic = true, updated_at = NOW() WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Message not found".into()));
    }

    let channel = format!("room:{}:chat", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "message_off_topic",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(Json(json!({ "message": "Message marked as off-topic" })))
}
