use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    routing::{get, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/:id", get(get_tenant))
        .route("/:id", put(update_tenant))
        .route("/:id/config", get(get_tenant_config))
        .route("/:id/config", put(update_tenant_config))
        .route("/:id/branding-history", get(get_branding_history))
}

#[derive(Debug, Deserialize)]
struct UpdateTenantRequest {
    name: Option<String>,
    domain: Option<String>,
    logo_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateTenantConfigRequest {
    max_rooms: Option<i32>,
    max_members_per_room: Option<i32>,
    features: Option<Value>,
    branding: Option<Value>,
}

/// GET /:id -- get a tenant by ID.
async fn get_tenant(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_tenant",
        "tenant_id": id
    })))
}

/// PUT /:id -- update a tenant.
async fn update_tenant(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTenantRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "update_tenant",
        "tenant_id": id,
        "name": body.name,
        "domain": body.domain,
        "logo_url": body.logo_url
    })))
}

/// GET /:id/config -- get tenant configuration.
async fn get_tenant_config(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_tenant_config",
        "tenant_id": id,
        "config": {}
    })))
}

/// PUT /:id/config -- update tenant configuration.
async fn update_tenant_config(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTenantConfigRequest>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "update_tenant_config",
        "tenant_id": id,
        "max_rooms": body.max_rooms,
        "max_members_per_room": body.max_members_per_room,
        "features": body.features,
        "branding": body.branding
    })))
}

/// GET /:id/branding-history -- get the branding history for a tenant.
async fn get_branding_history(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "get_branding_history",
        "tenant_id": id,
        "history": []
    })))
}
