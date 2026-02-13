use std::sync::Arc;

use axum::{
    extract::{Json, State},
    routing::post,
    Router,
};
use livekit_api::access_token::{AccessToken, VideoGrants};
use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, room_access::require_room_member},
    models::room::Room,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/token", post(generate_token))
}

#[derive(Debug, Deserialize)]
struct TokenRequest {
    /// The LiveKit room name to join.
    room: String,
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
    // Look up the room by name to verify membership
    let room = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE name = $1 AND is_active = true",
    )
    .bind(&body.room)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Room not found".into()))?;

    // Verify the user is a member of the room
    require_room_member(&state.pool, auth_user.id, room.id).await?;

    // Identity MUST always be the authenticated user's ID to prevent spoofing
    let identity = auth_user.id.to_string();

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
