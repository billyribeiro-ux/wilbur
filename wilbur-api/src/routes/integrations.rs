use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/:provider/config", get(get_provider_config))
        .route("/:provider/connect", get(connect_provider))
        .route("/:provider/exchange", post(exchange_token))
        .route("/:provider/refresh", post(refresh_token))
        .route("/:provider/disconnect", delete(disconnect_provider))
}

#[derive(Debug, Deserialize)]
struct ExchangeRequest {
    code: String,
    redirect_uri: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ConnectQuery {
    redirect_uri: Option<String>,
}

/// Validate that the provider is one of the supported values.
fn validate_provider(provider: &str) -> AppResult<()> {
    match provider {
        "spotify" | "x" | "linkedin" => Ok(()),
        _ => Err(AppError::BadRequest(format!(
            "Unsupported provider: {}. Supported: spotify, x, linkedin",
            provider
        ))),
    }
}

/// GET /:provider/config -- get the OAuth configuration for a provider.
async fn get_provider_config(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(provider): Path<String>,
) -> AppResult<Json<Value>> {
    validate_provider(&provider)?;

    Ok(Json(json!({
        "endpoint": "get_provider_config",
        "provider": provider,
        "client_id_configured": match provider.as_str() {
            "spotify" => !state.config.spotify_client_id.is_empty(),
            _ => false,
        }
    })))
}

/// GET /:provider/connect -- initiate an OAuth connection (returns redirect URL).
async fn connect_provider(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(provider): Path<String>,
    Query(params): Query<ConnectQuery>,
) -> AppResult<Json<Value>> {
    validate_provider(&provider)?;

    let redirect_uri = params.redirect_uri.unwrap_or_default();

    Ok(Json(json!({
        "endpoint": "connect_provider",
        "provider": provider,
        "redirect_uri": redirect_uri,
        "authorize_url": format!("https://{}.example.com/authorize", provider)
    })))
}

/// POST /:provider/exchange -- exchange an authorization code for tokens.
async fn exchange_token(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(provider): Path<String>,
    Json(body): Json<ExchangeRequest>,
) -> AppResult<Json<Value>> {
    validate_provider(&provider)?;

    Ok(Json(json!({
        "endpoint": "exchange_token",
        "provider": provider,
        "user_id": auth_user.id,
        "connected": true
    })))
}

/// POST /:provider/refresh -- refresh the provider's access token.
async fn refresh_token(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(provider): Path<String>,
) -> AppResult<Json<Value>> {
    validate_provider(&provider)?;

    Ok(Json(json!({
        "endpoint": "refresh_token",
        "provider": provider,
        "user_id": auth_user.id,
        "refreshed": true
    })))
}

/// DELETE /:provider/disconnect -- disconnect a provider integration.
async fn disconnect_provider(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(provider): Path<String>,
) -> AppResult<StatusCode> {
    validate_provider(&provider)?;

    Ok(StatusCode::NO_CONTENT)
}
