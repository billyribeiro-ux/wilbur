use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct UserTheme {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub theme_data: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateThemeRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    pub theme_data: serde_json::Value,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateThemeRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,
    pub theme_data: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

/// Theme response for API consumers.
#[derive(Debug, Serialize)]
pub struct ThemeResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub theme_data: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<UserTheme> for ThemeResponse {
    fn from(t: UserTheme) -> Self {
        Self {
            id: t.id,
            user_id: t.user_id,
            name: t.name,
            theme_data: t.theme_data,
            is_active: t.is_active,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}
