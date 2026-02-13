use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Messages sent from client to server.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Subscribe {
        channel: String,
    },
    Unsubscribe {
        channel: String,
    },
    Ping,
    Presence {
        channel: String,
        status: String,
    },
    Send {
        channel: String,
        payload: serde_json::Value,
    },
}

/// Messages sent from server to client.
#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    Event {
        channel: String,
        event: String,
        payload: serde_json::Value,
        timestamp: String,
        event_id: Uuid,
    },
    Subscribed {
        channel: String,
        member_count: usize,
    },
    Unsubscribed {
        channel: String,
    },
    Presence {
        channel: String,
        event: String,
        user_id: Uuid,
        display_name: String,
    },
    Pong,
    Error {
        message: String,
        code: String,
    },
    System {
        message: String,
    },
}
