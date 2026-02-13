use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "content_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    Text,
    Image,
    File,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub content_type: ContentType,
    pub is_pinned: bool,
    pub is_off_topic: bool,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Chat message joined with user display info.
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ChatMessageWithUser {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub content_type: ContentType,
    pub is_pinned: bool,
    pub is_off_topic: bool,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMessageRequest {
    #[validate(length(min = 1, max = 5000))]
    pub content: String,
    pub content_type: Option<ContentType>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMessageRequest {
    #[validate(length(min = 1, max = 5000))]
    pub content: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_off_topic: Option<bool>,
}

/// Message response for API consumers.
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub content_type: ContentType,
    pub is_pinned: bool,
    pub is_off_topic: bool,
    pub is_deleted: bool,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ChatMessageWithUser> for MessageResponse {
    fn from(m: ChatMessageWithUser) -> Self {
        Self {
            id: m.id,
            room_id: m.room_id,
            user_id: m.user_id,
            content: m.content,
            content_type: m.content_type,
            is_pinned: m.is_pinned,
            is_off_topic: m.is_off_topic,
            is_deleted: m.is_deleted,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}
