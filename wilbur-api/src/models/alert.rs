use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "alert_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AlertType {
    Buy,
    Sell,
    Info,
    Warning,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Alert {
    pub id: Uuid,
    pub room_id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub alert_type: AlertType,
    pub ticker_symbol: Option<String>,
    pub entry_price: Option<f64>,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
    pub media_url: Option<String>,
    pub legal_disclosure: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateAlertRequest {
    #[validate(length(min = 1, max = 200))]
    pub title: String,
    #[validate(length(max = 5000))]
    pub body: Option<String>,
    pub alert_type: AlertType,
    #[validate(length(max = 20))]
    pub ticker_symbol: Option<String>,
    pub entry_price: Option<f64>,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
    pub media_url: Option<String>,
    #[validate(length(max = 2000))]
    pub legal_disclosure: Option<String>,
}

/// Alert response for API consumers.
#[derive(Debug, Serialize)]
pub struct AlertResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub alert_type: AlertType,
    pub ticker_symbol: Option<String>,
    pub entry_price: Option<f64>,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
    pub media_url: Option<String>,
    pub legal_disclosure: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

impl From<Alert> for AlertResponse {
    fn from(a: Alert) -> Self {
        Self {
            id: a.id,
            room_id: a.room_id,
            author_id: a.author_id,
            title: a.title,
            body: a.body,
            alert_type: a.alert_type,
            ticker_symbol: a.ticker_symbol,
            entry_price: a.entry_price,
            stop_loss: a.stop_loss,
            take_profit: a.take_profit,
            media_url: a.media_url,
            legal_disclosure: a.legal_disclosure,
            is_active: a.is_active,
            created_at: a.created_at,
        }
    }
}
