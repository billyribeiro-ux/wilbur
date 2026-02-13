use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct RoomFile {
    pub id: Uuid,
    pub room_id: Uuid,
    pub uploaded_by: Uuid,
    pub file_name: String,
    pub file_url: String,
    pub file_size: i64,
    pub mime_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Note {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateNoteRequest {
    #[validate(length(min = 1, max = 200))]
    pub title: String,
    #[validate(length(min = 1, max = 50000))]
    pub content: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateNoteRequest {
    #[validate(length(min = 1, max = 200))]
    pub title: Option<String>,
    #[validate(length(min = 1, max = 50000))]
    pub content: Option<String>,
}

/// Room file response.
#[derive(Debug, Serialize)]
pub struct RoomFileResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub uploaded_by: Uuid,
    pub file_name: String,
    pub file_url: String,
    pub file_size: i64,
    pub mime_type: String,
    pub created_at: DateTime<Utc>,
}

impl From<RoomFile> for RoomFileResponse {
    fn from(f: RoomFile) -> Self {
        Self {
            id: f.id,
            room_id: f.room_id,
            uploaded_by: f.uploaded_by,
            file_name: f.file_name,
            file_url: f.file_url,
            file_size: f.file_size,
            mime_type: f.mime_type,
            created_at: f.created_at,
        }
    }
}

/// Note response.
#[derive(Debug, Serialize)]
pub struct NoteResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Note> for NoteResponse {
    fn from(n: Note) -> Self {
        Self {
            id: n.id,
            room_id: n.room_id,
            user_id: n.user_id,
            title: n.title,
            content: n.content,
            created_at: n.created_at,
            updated_at: n.updated_at,
        }
    }
}
