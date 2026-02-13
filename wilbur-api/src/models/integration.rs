use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "integration_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum IntegrationType {
    Spotify,
    X,
    Linkedin,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct UserIntegration {
    pub id: Uuid,
    pub user_id: Uuid,
    pub integration_type: IntegrationType,
    #[serde(skip_serializing)]
    pub access_token_encrypted: String,
    #[serde(skip_serializing)]
    pub refresh_token_encrypted: Option<String>,
    pub external_user_id: Option<String>,
    pub external_username: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Integration response (excludes sensitive tokens).
#[derive(Debug, Serialize)]
pub struct IntegrationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub integration_type: IntegrationType,
    pub external_user_id: Option<String>,
    pub external_username: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl From<UserIntegration> for IntegrationResponse {
    fn from(i: UserIntegration) -> Self {
        Self {
            id: i.id,
            user_id: i.user_id,
            integration_type: i.integration_type,
            external_user_id: i.external_user_id,
            external_username: i.external_username,
            expires_at: i.expires_at,
            created_at: i.created_at,
        }
    }
}
