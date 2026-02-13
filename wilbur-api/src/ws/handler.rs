use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket};
use futures::{SinkExt, StreamExt};
use tokio::sync::mpsc;

use crate::state::AppState;
use crate::ws::channels::Channel;
use crate::ws::manager::WsManager;
use crate::ws::protocol::{ClientMessage, ServerMessage};

/// Handle an authenticated WebSocket connection.
pub async fn handle_socket(socket: WebSocket, state: Arc<AppState>, user_id: uuid::Uuid) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Spawn task to forward messages from internal channel to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Send welcome message
    let welcome = ServerMessage::System {
        message: "Connected to Wilbur WebSocket".to_string(),
    };
    if let Ok(json) = serde_json::to_string(&welcome) {
        let _ = tx.send(json);
    }

    // Process incoming messages
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                let text_str: &str = &text;
                match serde_json::from_str::<ClientMessage>(text_str) {
                    Ok(client_msg) => {
                        handle_client_message(&state, &tx, user_id, client_msg).await;
                    }
                    Err(e) => {
                        let err = ServerMessage::Error {
                            message: format!("Invalid message: {e}"),
                            code: "INVALID_MESSAGE".to_string(),
                        };
                        if let Ok(json) = serde_json::to_string(&err) {
                            let _ = tx.send(json);
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Cleanup on disconnect
    WsManager::disconnect(&state);
    send_task.abort();
    tracing::debug!("WebSocket disconnected for user {user_id}");
}

async fn handle_client_message(
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<String>,
    user_id: uuid::Uuid,
    msg: ClientMessage,
) {
    match msg {
        ClientMessage::Subscribe { channel } => {
            // Validate channel format
            let parsed = match Channel::parse(&channel) {
                Some(c) => c,
                None => {
                    send_error(tx, "Invalid channel format", "INVALID_CHANNEL");
                    return;
                }
            };

            // Authorization: room channels require membership
            if let Some(room_id) = parsed.room_id() {
                let is_member = sqlx::query_scalar::<_, bool>(
                    "SELECT EXISTS(SELECT 1 FROM room_memberships WHERE room_id = $1 AND user_id = $2 AND status = 'active')"
                )
                .bind(room_id)
                .bind(user_id)
                .fetch_one(&state.pool)
                .await
                .unwrap_or(false);

                if !is_member {
                    send_error(tx, "Not a member of this room", "FORBIDDEN");
                    return;
                }
            }

            // Authorization: notification channels require matching user
            if let Some(uid) = parsed.user_id() {
                if uid != user_id {
                    send_error(tx, "Cannot subscribe to another user's notifications", "FORBIDDEN");
                    return;
                }
            }

            let member_count = WsManager::subscribe(state, &channel, tx.clone());
            let resp = ServerMessage::Subscribed {
                channel,
                member_count,
            };
            if let Ok(json) = serde_json::to_string(&resp) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Unsubscribe { channel } => {
            WsManager::unsubscribe(state, &channel);
            let resp = ServerMessage::Unsubscribed { channel };
            if let Ok(json) = serde_json::to_string(&resp) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Ping => {
            let resp = ServerMessage::Pong;
            if let Ok(json) = serde_json::to_string(&resp) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Presence { channel, status } => {
            let event = if status == "typing" { "typing" } else { "status" };
            let msg = ServerMessage::Presence {
                channel: channel.clone(),
                event: event.to_string(),
                user_id,
                display_name: String::new(), // Populated from DB in production
            };
            WsManager::broadcast(state, &channel, &msg);
        }

        ClientMessage::Send { channel, payload } => {
            WsManager::notify_change(state, &channel, "message", payload);
        }
    }
}

fn send_error(tx: &mpsc::UnboundedSender<String>, message: &str, code: &str) {
    let err = ServerMessage::Error {
        message: message.to_string(),
        code: code.to_string(),
    };
    if let Ok(json) = serde_json::to_string(&err) {
        let _ = tx.send(json);
    }
}
