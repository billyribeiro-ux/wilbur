use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "member_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum MemberRole {
    Host,
    Moderator,
    Member,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "member_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum MemberStatus {
    Active,
    Inactive,
    Banned,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct RoomMembership {
    pub id: Uuid,
    pub user_id: Uuid,
    pub room_id: Uuid,
    pub role: MemberRole,
    pub status: MemberStatus,
    pub city: Option<String>,
    pub state_name: Option<String>,
    pub country: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct JoinRoomRequest {
    pub room_id: Uuid,
    #[validate(length(max = 100))]
    pub city: Option<String>,
    #[validate(length(max = 100))]
    pub state_name: Option<String>,
    #[validate(length(max = 100))]
    pub country: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMemberRoleRequest {
    pub user_id: Uuid,
    pub role: MemberRole,
}

/// Membership response with basic info.
#[derive(Debug, Serialize)]
pub struct MembershipResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub room_id: Uuid,
    pub role: MemberRole,
    pub status: MemberStatus,
    pub city: Option<String>,
    pub state_name: Option<String>,
    pub country: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<RoomMembership> for MembershipResponse {
    fn from(m: RoomMembership) -> Self {
        Self {
            id: m.id,
            user_id: m.user_id,
            room_id: m.room_id,
            role: m.role,
            status: m.status,
            city: m.city,
            state_name: m.state_name,
            country: m.country,
            created_at: m.created_at,
        }
    }
}
