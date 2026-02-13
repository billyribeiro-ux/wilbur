use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "report_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ReportStatus {
    Pending,
    Reviewed,
    Dismissed,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct BannedUser {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub banned_by: Uuid,
    pub reason: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ModerationLog {
    pub id: Uuid,
    pub room_id: Uuid,
    pub moderator_id: Uuid,
    pub target_user_id: Uuid,
    pub action: String,
    pub details: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ReportedContent {
    pub id: Uuid,
    pub room_id: Uuid,
    pub reporter_id: Uuid,
    pub content_type: String,
    pub content_id: Uuid,
    pub reason: String,
    pub status: ReportStatus,
    pub reviewed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct BanUserRequest {
    pub user_id: Uuid,
    #[validate(length(max = 1000))]
    pub reason: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ReportContentRequest {
    pub content_type: String,
    pub content_id: Uuid,
    #[validate(length(min = 1, max = 1000))]
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct ReviewReportRequest {
    pub status: ReportStatus,
}

/// Banned user response.
#[derive(Debug, Serialize)]
pub struct BannedUserResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub banned_by: Uuid,
    pub reason: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl From<BannedUser> for BannedUserResponse {
    fn from(b: BannedUser) -> Self {
        Self {
            id: b.id,
            room_id: b.room_id,
            user_id: b.user_id,
            banned_by: b.banned_by,
            reason: b.reason,
            expires_at: b.expires_at,
            created_at: b.created_at,
        }
    }
}

/// Moderation log response.
#[derive(Debug, Serialize)]
pub struct ModerationLogResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub moderator_id: Uuid,
    pub target_user_id: Uuid,
    pub action: String,
    pub details: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<ModerationLog> for ModerationLogResponse {
    fn from(l: ModerationLog) -> Self {
        Self {
            id: l.id,
            room_id: l.room_id,
            moderator_id: l.moderator_id,
            target_user_id: l.target_user_id,
            action: l.action,
            details: l.details,
            created_at: l.created_at,
        }
    }
}

/// Reported content response.
#[derive(Debug, Serialize)]
pub struct ReportedContentResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub reporter_id: Uuid,
    pub content_type: String,
    pub content_id: Uuid,
    pub reason: String,
    pub status: ReportStatus,
    pub reviewed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<ReportedContent> for ReportedContentResponse {
    fn from(r: ReportedContent) -> Self {
        Self {
            id: r.id,
            room_id: r.room_id,
            reporter_id: r.reporter_id,
            content_type: r.content_type,
            content_id: r.content_id,
            reason: r.reason,
            status: r.status,
            reviewed_by: r.reviewed_by,
            created_at: r.created_at,
        }
    }
}
