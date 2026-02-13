use std::sync::Arc;

use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use serde_json::{json, Value};

use crate::state::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/ready", get(readiness_check))
}

/// GET /health -- returns {"status":"ok"} unconditionally.
async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// GET /ready -- verifies the database pool is reachable.
async fn readiness_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
    {
        Ok(_) => Ok(Json(json!({ "status": "ready", "database": "connected" }))),
        Err(e) => {
            tracing::error!("Readiness check failed: {e}");
            Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "status": "not_ready", "database": "disconnected" })),
            ))
        }
    }
}
