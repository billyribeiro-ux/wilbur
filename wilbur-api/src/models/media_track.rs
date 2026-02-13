use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "track_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum TrackType {
    Audio,
    Video,
    Screen,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct MediaTrack {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub track_id: String,
    pub track_type: TrackType,
    pub is_active: bool,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Media track response.
#[derive(Debug, Serialize)]
pub struct MediaTrackResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub track_id: String,
    pub track_type: TrackType,
    pub is_active: bool,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

impl From<MediaTrack> for MediaTrackResponse {
    fn from(t: MediaTrack) -> Self {
        Self {
            id: t.id,
            room_id: t.room_id,
            user_id: t.user_id,
            track_id: t.track_id,
            track_type: t.track_type,
            is_active: t.is_active,
            metadata: t.metadata,
            created_at: t.created_at,
        }
    }
}
