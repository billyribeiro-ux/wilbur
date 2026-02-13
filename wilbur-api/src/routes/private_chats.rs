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
    state::AppState,
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
    Ok(Json(json!({
        "endpoint": "list_private_chats",
        "user_id": auth_user.id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "chats": []
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

    let chat_id = Uuid::new_v4();

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": chat_id,
            "participants": [auth_user.id, body.user_id],
            "endpoint": "create_private_chat"
        })),
    ))
}

/// GET /user/:user_id -- find an existing DM conversation with a specific user.
async fn find_chat_by_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "find_chat_by_user",
        "current_user": auth_user.id,
        "other_user": user_id,
        "chat": null
    })))
}

/// GET /:id/messages -- list messages in a DM conversation.
async fn list_chat_messages(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_chat_messages",
        "chat_id": id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "messages": []
    })))
}

/// POST /:id/messages -- send a message in a DM conversation.
async fn send_chat_message(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<SendMessageRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let message_id = Uuid::new_v4();

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": message_id,
            "chat_id": id,
            "user_id": auth_user.id,
            "content": body.content,
            "endpoint": "send_chat_message"
        })),
    ))
}
