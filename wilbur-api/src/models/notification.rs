use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub is_read: bool,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// Notification response for API consumers.
#[derive(Debug, Serialize)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub is_read: bool,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

impl From<Notification> for NotificationResponse {
    fn from(n: Notification) -> Self {
        Self {
            id: n.id,
            user_id: n.user_id,
            title: n.title,
            body: n.body,
            notification_type: n.notification_type,
            is_read: n.is_read,
            data: n.data,
            created_at: n.created_at,
        }
    }
}
