use std::sync::Arc;

use uuid::Uuid;

use crate::state::AppState;
use crate::ws::protocol::ServerMessage;

/// Manages WebSocket channel subscriptions and broadcasting.
pub struct WsManager;

impl WsManager {
    /// Subscribe a sender to a channel.
    pub fn subscribe(
        state: &Arc<AppState>,
        channel: &str,
        sender: crate::state::WsSender,
    ) -> usize {
        let mut entry = state.ws_channels.entry(channel.to_string()).or_default();
        entry.push(sender);
        entry.len()
    }

    /// Unsubscribe a sender from a channel by removing closed senders.
    pub fn unsubscribe(state: &Arc<AppState>, channel: &str) {
        if let Some(mut entry) = state.ws_channels.get_mut(channel) {
            entry.retain(|s| !s.is_closed());
            if entry.is_empty() {
                drop(entry);
                state.ws_channels.remove(channel);
            }
        }
    }

    /// Broadcast a server message to all subscribers of a channel.
    pub fn broadcast(state: &Arc<AppState>, channel: &str, msg: &ServerMessage) {
        if let Some(mut senders) = state.ws_channels.get_mut(channel) {
            let json = match serde_json::to_string(msg) {
                Ok(j) => j,
                Err(e) => {
                    tracing::error!("Failed to serialize WS message: {e}");
                    return;
                }
            };

            senders.retain(|sender| sender.send(json.clone()).is_ok());

            if senders.is_empty() {
                drop(senders);
                state.ws_channels.remove(channel);
            }
        }
    }

    /// Notify a channel about a data change (used by REST handlers after mutations).
    pub fn notify_change(
        state: &Arc<AppState>,
        channel: &str,
        event: &str,
        payload: serde_json::Value,
    ) {
        let msg = ServerMessage::Event {
            channel: channel.to_string(),
            event: event.to_string(),
            payload,
            timestamp: chrono::Utc::now().to_rfc3339(),
            event_id: Uuid::new_v4(),
        };
        Self::broadcast(state, channel, &msg);
    }

    /// Remove all closed senders from a specific connection.
    pub fn disconnect(state: &Arc<AppState>) {
        let keys: Vec<String> = state
            .ws_channels
            .iter()
            .map(|e| e.key().clone())
            .collect();

        for key in keys {
            if let Some(mut entry) = state.ws_channels.get_mut(&key) {
                entry.retain(|s| !s.is_closed());
                if entry.is_empty() {
                    drop(entry);
                    state.ws_channels.remove(&key);
                }
            }
        }
    }
}
