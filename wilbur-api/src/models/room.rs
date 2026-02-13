use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Room {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub title: String,
    pub description: String,
    pub max_members: i32,
    pub is_active: bool,
    pub background_image_url: Option<String>,
    pub header_color: Option<String>,
    pub accent_color: Option<String>,
    pub font_family: Option<String>,
    pub border_style: Option<String>,
    pub shadow_style: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRoomRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(min = 1, max = 200))]
    pub title: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub max_members: Option<i32>,
    pub background_image_url: Option<String>,
    pub header_color: Option<String>,
    pub accent_color: Option<String>,
    pub font_family: Option<String>,
    pub border_style: Option<String>,
    pub shadow_style: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateRoomRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 200))]
    pub title: Option<String>,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub max_members: Option<i32>,
    pub is_active: Option<bool>,
    pub background_image_url: Option<String>,
    pub header_color: Option<String>,
    pub accent_color: Option<String>,
    pub font_family: Option<String>,
    pub border_style: Option<String>,
    pub shadow_style: Option<String>,
}

/// Public room response.
#[derive(Debug, Serialize)]
pub struct RoomResponse {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub title: String,
    pub description: String,
    pub max_members: i32,
    pub is_active: bool,
    pub background_image_url: Option<String>,
    pub header_color: Option<String>,
    pub accent_color: Option<String>,
    pub font_family: Option<String>,
    pub border_style: Option<String>,
    pub shadow_style: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Room> for RoomResponse {
    fn from(r: Room) -> Self {
        Self {
            id: r.id,
            tenant_id: r.tenant_id,
            name: r.name,
            title: r.title,
            description: r.description,
            max_members: r.max_members,
            is_active: r.is_active,
            background_image_url: r.background_image_url,
            header_color: r.header_color,
            accent_color: r.accent_color,
            font_family: r.font_family,
            border_style: r.border_style,
            shadow_style: r.shadow_style,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}
