use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, pagination::PaginationParams},
    models::private_chat::{
        PrivateChat, PrivateChatResponse, PrivateMessage, PrivateMessageResponse,
    },
    state::AppState,
    ws::manager::WsManager,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_chats))
        .route("/", post(create_chat))
        .route("/user/:user_id", get(find_chat_by_user))
        .route("/:id/messages", get(list_chat_messages))
        .route("/:id/messages", post(send_chat_message))
}

#[derive(Debug, Deserialize)]
struct CreateChatRequest {
    /// The other user to start a DM with.
    user_id: Uuid,
}

#[derive(Debug, Deserialize)]
struct SendMessageRequest {
    content: String,
}

/// GET / -- list all DM conversations for the authenticated user.
async fn list_chats(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    let limit = pagination.limit();
    let offset = pagination.offset();

    let chats = sqlx::query_as::<_, PrivateChat>(
        r#"
        SELECT id, participant_one, participant_two, created_at
        FROM private_chats
        WHERE participant_one = $1 OR participant_two = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(auth_user.id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<PrivateChatResponse> = chats.into_iter().map(PrivateChatResponse::from).collect();

    Ok(Json(json!({
        "user_id": auth_user.id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "chats": data
    })))
}

/// POST / -- create a new DM conversation.
async fn create_chat(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateChatRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    if auth_user.id == body.user_id {
        return Err(AppError::BadRequest("Cannot create a DM with yourself".into()));
    }

    // Ensure participant_one < participant_two to satisfy the CHECK constraint
    let (p1, p2) = if auth_user.id < body.user_id {
        (auth_user.id, body.user_id)
    } else {
        (body.user_id, auth_user.id)
    };

    let chat_id = Uuid::new_v4();

    let chat = sqlx::query_as::<_, PrivateChat>(
        r#"
        INSERT INTO private_chats (id, participant_one, participant_two, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (participant_one, participant_two) DO UPDATE
            SET id = private_chats.id
        RETURNING id, participant_one, participant_two, created_at
        "#,
    )
    .bind(chat_id)
    .bind(p1)
    .bind(p2)
    .fetch_one(&state.pool)
    .await?;

    let response = PrivateChatResponse::from(chat);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    Ok((StatusCode::CREATED, Json(response_json)))
}

/// GET /user/:user_id -- find an existing DM conversation with a specific user.
async fn find_chat_by_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let chat = sqlx::query_as::<_, PrivateChat>(
        r#"
        SELECT id, participant_one, participant_two, created_at
        FROM private_chats
        WHERE (participant_one = $1 AND participant_two = $2)
           OR (participant_one = $2 AND participant_two = $1)
        "#,
    )
    .bind(auth_user.id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    match chat {
        Some(c) => {
            let response = PrivateChatResponse::from(c);
            let response_json = serde_json::to_value(&response)
                .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;
            Ok(Json(json!({
                "current_user": auth_user.id,
                "other_user": user_id,
                "chat": response_json
            })))
        }
        None => Ok(Json(json!({
            "current_user": auth_user.id,
            "other_user": user_id,
            "chat": null
        }))),
    }
}

/// Verify the authenticated user is a participant of the given chat.
async fn require_chat_participant(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    chat_id: Uuid,
) -> AppResult<PrivateChat> {
    let chat = sqlx::query_as::<_, PrivateChat>(
        r#"
        SELECT id, participant_one, participant_two, created_at
        FROM private_chats
        WHERE id = $1 AND (participant_one = $2 OR participant_two = $2)
        "#,
    )
    .bind(chat_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Forbidden("You are not a participant of this chat".into()))?;

    Ok(chat)
}

/// GET /:id/messages -- list messages in a DM conversation.
async fn list_chat_messages(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    // Verify the authenticated user is a participant of the chat
    require_chat_participant(&state.pool, auth_user.id, id).await?;

    let limit = pagination.limit();
    let offset = pagination.offset();

    let messages = sqlx::query_as::<_, PrivateMessage>(
        r#"
        SELECT id, chat_id, sender_id, content, is_read, created_at
        FROM private_messages
        WHERE chat_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<PrivateMessageResponse> =
        messages.into_iter().map(PrivateMessageResponse::from).collect();

    Ok(Json(json!({
        "chat_id": id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "messages": data
    })))
}

/// POST /:id/messages -- send a message in a DM conversation.
async fn send_chat_message(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<SendMessageRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    // Verify the authenticated user is a participant of the chat
    require_chat_participant(&state.pool, auth_user.id, id).await?;

    let message_id = Uuid::new_v4();

    let message = sqlx::query_as::<_, PrivateMessage>(
        r#"
        INSERT INTO private_messages (id, chat_id, sender_id, content, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, chat_id, sender_id, content, is_read, created_at
        "#,
    )
    .bind(message_id)
    .bind(id)
    .bind(auth_user.id)
    .bind(&body.content)
    .fetch_one(&state.pool)
    .await?;

    let response = PrivateMessageResponse::from(message);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    // Notify via WebSocket
    let channel = format!("dm:{}", id);
    WsManager::notify_change(&state, &channel, "private_message_sent", response_json.clone());

    Ok((StatusCode::CREATED, Json(response_json)))
}
