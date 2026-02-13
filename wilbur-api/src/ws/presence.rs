use std::sync::Arc;

use crate::state::AppState;
use crate::ws::manager::WsManager;

/// Spawn a background task that periodically cleans up stale WebSocket connections.
pub fn spawn_presence_cleanup(state: Arc<AppState>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            WsManager::disconnect(&state);
        }
    });
}
