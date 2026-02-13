use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::mpsc;

use crate::config::AppConfig;

pub type WsSender = mpsc::UnboundedSender<String>;

/// Shared application state accessible from all handlers.
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
    pub s3: aws_sdk_s3::Client,
    /// WebSocket channel subscriptions: channel_name → list of senders
    pub ws_channels: DashMap<String, Vec<WsSender>>,
}

impl AppState {
    pub fn new(pool: PgPool, config: AppConfig, s3: aws_sdk_s3::Client) -> Self {
        Self {
            pool,
            config,
            s3,
            ws_channels: DashMap::new(),
        }
    }
}

/// Type alias used in handler signatures.
pub type SharedState = Arc<AppState>;
