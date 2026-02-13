use std::sync::Arc;

use axum::{
    extract::{Json, Path, State},
    routing::{get, put},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    models::tenant::{Tenant, TenantResponse, UpdateTenantRequest},
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
struct UpdateTenantConfigRequest {
    key: String,
    value: Value,
}

#[derive(Debug, FromRow, Serialize)]
struct TenantConfig {
    id: Uuid,
    tenant_id: Uuid,
    key: String,
    value: Value,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
struct BrandingAuditEntry {
    id: Uuid,
    tenant_id: Uuid,
    changed_by: Uuid,
    field_name: String,
    old_value: Option<String>,
    new_value: Option<String>,
    created_at: DateTime<Utc>,
}

/// GET /:id -- get a tenant by ID.
async fn get_tenant(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<TenantResponse>> {
    let tenant = sqlx::query_as::<_, Tenant>("SELECT * FROM tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Tenant not found".into()))?;

    Ok(Json(TenantResponse::from(tenant)))
}

/// PUT /:id -- update a tenant.
async fn update_tenant(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTenantRequest>,
) -> AppResult<Json<TenantResponse>> {
    let tenant = sqlx::query_as::<_, Tenant>(
        r#"
        UPDATE tenants SET
            business_name        = COALESCE($1, business_name),
            logo_url             = COALESCE($2, logo_url),
            primary_color        = COALESCE($3, primary_color),
            secondary_color      = COALESCE($4, secondary_color),
            accent_color         = COALESCE($5, accent_color),
            header_font          = COALESCE($6, header_font),
            body_font            = COALESCE($7, body_font),
            border_radius        = COALESCE($8, border_radius),
            background_image_url = COALESCE($9, background_image_url),
            favicon_url          = COALESCE($10, favicon_url),
            tagline              = COALESCE($11, tagline),
            website_url          = COALESCE($12, website_url),
            support_email        = COALESCE($13, support_email),
            custom_css           = COALESCE($14, custom_css),
            login_background_url = COALESCE($15, login_background_url),
            dashboard_layout     = COALESCE($16, dashboard_layout),
            sidebar_position     = COALESCE($17, sidebar_position),
            updated_at           = NOW()
        WHERE id = $18
        RETURNING *
        "#,
    )
    .bind(&body.business_name)
    .bind(&body.logo_url)
    .bind(&body.primary_color)
    .bind(&body.secondary_color)
    .bind(&body.accent_color)
    .bind(&body.header_font)
    .bind(&body.body_font)
    .bind(&body.border_radius)
    .bind(&body.background_image_url)
    .bind(&body.favicon_url)
    .bind(&body.tagline)
    .bind(&body.website_url)
    .bind(&body.support_email)
    .bind(&body.custom_css)
    .bind(&body.login_background_url)
    .bind(&body.dashboard_layout)
    .bind(&body.sidebar_position)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Tenant not found".into()))?;

    Ok(Json(TenantResponse::from(tenant)))
}

/// GET /:id/config -- get all configuration key-value pairs for a tenant.
async fn get_tenant_config(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<TenantConfig>>> {
    let configs = sqlx::query_as::<_, TenantConfig>(
        "SELECT * FROM tenant_configuration WHERE tenant_id = $1 ORDER BY key",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(configs))
}

/// PUT /:id/config -- upsert a tenant configuration key-value pair.
async fn update_tenant_config(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTenantConfigRequest>,
) -> AppResult<Json<TenantConfig>> {
    let config = sqlx::query_as::<_, TenantConfig>(
        r#"
        INSERT INTO tenant_configuration (id, tenant_id, key, value, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = $4, updated_at = NOW()
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(id)
    .bind(&body.key)
    .bind(&body.value)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(config))
}

/// GET /:id/branding-history -- get the branding audit log for a tenant.
async fn get_branding_history(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<BrandingAuditEntry>>> {
    let entries = sqlx::query_as::<_, BrandingAuditEntry>(
        "SELECT * FROM branding_audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(entries))
}
