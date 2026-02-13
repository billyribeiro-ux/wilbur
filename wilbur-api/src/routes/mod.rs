pub mod alerts;
pub mod auth;
pub mod health;
pub mod integrations;
pub mod livekit;
pub mod media_tracks;
pub mod messages;
pub mod moderation;
pub mod notifications;
pub mod polls;
pub mod private_chats;
pub mod rooms;
pub mod storage;
pub mod tenants;
pub mod themes;
pub mod users;
pub mod ws;

use std::sync::Arc;

use axum::Router;

use crate::state::AppState;

/// Build the top-level router with all sub-routers merged.
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Health / readiness at root level
        .merge(health::router())
        // WebSocket at root level
        .nest("/ws", ws::router())
        // API v1 namespaced routes
        .nest("/api/v1/auth", auth::router())
        .nest("/api/v1/users", users::router())
        .nest("/api/v1/rooms", rooms::router())
        .nest("/api/v1/rooms/:room_id/messages", messages::router())
        .nest("/api/v1/rooms/:room_id/alerts", alerts::router())
        .nest("/api/v1/rooms/:room_id/polls", polls::router())
        .nest("/api/v1/integrations", integrations::router())
        .nest("/api/v1/storage", storage::router())
        .nest("/api/v1/themes", themes::router())
        .nest("/api/v1/tenants", tenants::router())
        .nest("/api/v1/livekit", livekit::router())
        .nest("/api/v1/moderation", moderation::router())
        .nest("/api/v1/dm", private_chats::router())
        .nest("/api/v1/notifications", notifications::router())
        .nest("/api/v1/rooms/:room_id/tracks", media_tracks::router())
}
