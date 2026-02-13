use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{
    extractors::auth::Claims,
    state::AppState,
    ws::{
        channels::Channel,
        manager::WsManager,
        protocol::{ClientMessage, ServerMessage},
    },
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/", get(ws_upgrade))
}

#[derive(Debug, Deserialize)]
struct WsQuery {
    token: String,
}

/// GET /ws?token=<jwt> -- upgrade to WebSocket connection.
async fn ws_upgrade(
    State(state): State<Arc<AppState>>,
    Query(params): Query<WsQuery>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    // Validate JWT before upgrading
    let claims = match decode::<Claims>(
        &params.token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(e) => {
            tracing::warn!("WebSocket auth failed: {e}");
            // Return an error response instead of upgrading
            return axum::http::Response::builder()
                .status(axum::http::StatusCode::UNAUTHORIZED)
                .body(axum::body::Body::from("Invalid token"))
                .unwrap()
                .into_response();
        }
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, claims))
        .into_response()
}

/// Handle an authenticated WebSocket connection.
async fn handle_socket(socket: WebSocket, state: Arc<AppState>, claims: Claims) {
    let user_id = claims.sub;
    let display_name = claims.email.clone();

    tracing::info!(user_id = %user_id, "WebSocket connected");

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Channel for sending messages to this client from broadcast subs
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Track channels this connection is subscribed to
    let mut subscribed_channels: Vec<String> = Vec::new();

    // Send welcome message
    let welcome = ServerMessage::System {
        message: format!("Connected as {}", display_name),
    };
    if let Ok(json) = serde_json::to_string(&welcome) {
        let _ = ws_sender.send(Message::Text(json.into())).await;
    }

    // Task to forward messages from the broadcast channel to the WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages from the client
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                let text_str: &str = &text;
                match serde_json::from_str::<ClientMessage>(text_str) {
                    Ok(client_msg) => {
                        handle_client_message(
                            &state,
                            &tx,
                            &mut subscribed_channels,
                            user_id,
                            &display_name,
                            client_msg,
                        )
                        .await;
                    }
                    Err(e) => {
                        let err_msg = ServerMessage::Error {
                            message: format!("Invalid message: {e}"),
                            code: "INVALID_MESSAGE".to_string(),
                        };
                        if let Ok(json) = serde_json::to_string(&err_msg) {
                            let _ = tx.send(json);
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Client disconnected -- clean up subscriptions
    tracing::info!(user_id = %user_id, "WebSocket disconnected");
    drop(tx); // Close the sender so the send_task ends
    send_task.abort();

    // Unsubscribe from all channels
    for channel in &subscribed_channels {
        WsManager::unsubscribe(&state, channel);
    }

    // Clean up any closed senders
    WsManager::disconnect(&state);
}

/// Process a single client message.
async fn handle_client_message(
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<String>,
    subscribed_channels: &mut Vec<String>,
    user_id: Uuid,
    display_name: &str,
    msg: ClientMessage,
) {
    match msg {
        ClientMessage::Subscribe { channel } => {
            // Validate channel format
            if Channel::parse(&channel).is_none() {
                let err = ServerMessage::Error {
                    message: format!("Invalid channel: {channel}"),
                    code: "INVALID_CHANNEL".to_string(),
                };
                if let Ok(json) = serde_json::to_string(&err) {
                    let _ = tx.send(json);
                }
                return;
            }

            let member_count = WsManager::subscribe(state, &channel, tx.clone());
            subscribed_channels.push(channel.clone());

            let ack = ServerMessage::Subscribed {
                channel: channel.clone(),
                member_count,
            };
            if let Ok(json) = serde_json::to_string(&ack) {
                let _ = tx.send(json);
            }

            // Broadcast presence join
            let presence = ServerMessage::Presence {
                channel,
                event: "join".to_string(),
                user_id,
                display_name: display_name.to_string(),
            };
            // This will be broadcast to all subscribers of the channel
            if let Ok(json) = serde_json::to_string(&presence) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Unsubscribe { channel } => {
            subscribed_channels.retain(|c| c != &channel);
            WsManager::unsubscribe(state, &channel);

            let ack = ServerMessage::Unsubscribed {
                channel: channel.clone(),
            };
            if let Ok(json) = serde_json::to_string(&ack) {
                let _ = tx.send(json);
            }

            // Broadcast presence leave
            let presence = ServerMessage::Presence {
                channel,
                event: "leave".to_string(),
                user_id,
                display_name: display_name.to_string(),
            };
            if let Ok(json) = serde_json::to_string(&presence) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Ping => {
            let pong = ServerMessage::Pong;
            if let Ok(json) = serde_json::to_string(&pong) {
                let _ = tx.send(json);
            }
        }

        ClientMessage::Presence { channel, status } => {
            let presence = ServerMessage::Presence {
                channel: channel.clone(),
                event: status,
                user_id,
                display_name: display_name.to_string(),
            };
            WsManager::broadcast(state, &channel, &presence);
        }

        ClientMessage::Send { channel, payload } => {
            if !subscribed_channels.contains(&channel) {
                let err = ServerMessage::Error {
                    message: "Not subscribed to channel".to_string(),
                    code: "NOT_SUBSCRIBED".to_string(),
                };
                if let Ok(json) = serde_json::to_string(&err) {
                    let _ = tx.send(json);
                }
                return;
            }

            let event = ServerMessage::Event {
                channel: channel.clone(),
                event: "message".to_string(),
                payload,
                timestamp: chrono::Utc::now().to_rfc3339(),
                event_id: Uuid::new_v4(),
            };
            WsManager::broadcast(state, &channel, &event);
        }
    }
}
