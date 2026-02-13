use std::sync::Arc;

use axum::{
    extract::{Json, State},
    routing::post,
    Router,
};
use livekit_api::access_token::{AccessToken, TokenVerifier, VideoGrants};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/token", post(generate_token))
}

#[derive(Debug, Deserialize)]
struct TokenRequest {
    /// The LiveKit room name to join.
    room: String,
    /// Optional identity override; defaults to the authenticated user's ID.
    identity: Option<String>,
}

#[derive(Debug, Serialize)]
struct TokenResponse {
    token: String,
    url: String,
}

/// POST /token -- generate a LiveKit access token for the authenticated user.
async fn generate_token(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<TokenRequest>,
) -> AppResult<Json<TokenResponse>> {
    let identity = body
        .identity
        .unwrap_or_else(|| auth_user.id.to_string());

    let token = AccessToken::with_api_key(
        &state.config.livekit_api_key,
        &state.config.livekit_api_secret,
    )
    .with_identity(&identity)
    .with_name(&auth_user.email)
    .with_grants(VideoGrants {
        room_join: true,
        room: body.room.clone(),
        ..Default::default()
    })
    .to_jwt()
    .map_err(|e| AppError::Internal(format!("Failed to generate LiveKit token: {e}")))?;

    Ok(Json(TokenResponse {
        token,
        url: state.config.livekit_url.clone(),
    }))
}
