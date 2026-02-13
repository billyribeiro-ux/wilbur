use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct PrivateChat {
    pub id: Uuid,
    pub participant_one: Uuid,
    pub participant_two: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct PrivateMessage {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePrivateChatRequest {
    pub participant_id: Uuid,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SendPrivateMessageRequest {
    #[validate(length(min = 1, max = 5000))]
    pub content: String,
}

/// Private chat response.
#[derive(Debug, Serialize)]
pub struct PrivateChatResponse {
    pub id: Uuid,
    pub participant_one: Uuid,
    pub participant_two: Uuid,
    pub created_at: DateTime<Utc>,
}

impl From<PrivateChat> for PrivateChatResponse {
    fn from(c: PrivateChat) -> Self {
        Self {
            id: c.id,
            participant_one: c.participant_one,
            participant_two: c.participant_two,
            created_at: c.created_at,
        }
    }
}

/// Private message response.
#[derive(Debug, Serialize)]
pub struct PrivateMessageResponse {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

impl From<PrivateMessage> for PrivateMessageResponse {
    fn from(m: PrivateMessage) -> Self {
        Self {
            id: m.id,
            chat_id: m.chat_id,
            sender_id: m.sender_id,
            content: m.content,
            is_read: m.is_read,
            created_at: m.created_at,
        }
    }
}
