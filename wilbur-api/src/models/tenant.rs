use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Tenant {
    pub id: Uuid,
    pub business_name: String,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub header_font: Option<String>,
    pub body_font: Option<String>,
    pub border_radius: Option<String>,
    pub background_image_url: Option<String>,
    pub favicon_url: Option<String>,
    pub tagline: Option<String>,
    pub website_url: Option<String>,
    pub support_email: Option<String>,
    pub custom_css: Option<String>,
    pub login_background_url: Option<String>,
    pub dashboard_layout: Option<String>,
    pub sidebar_position: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTenantRequest {
    #[validate(length(min = 1, max = 200))]
    pub business_name: String,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub header_font: Option<String>,
    pub body_font: Option<String>,
    pub border_radius: Option<String>,
    pub background_image_url: Option<String>,
    pub favicon_url: Option<String>,
    pub tagline: Option<String>,
    pub website_url: Option<String>,
    pub support_email: Option<String>,
    pub custom_css: Option<String>,
    pub login_background_url: Option<String>,
    pub dashboard_layout: Option<String>,
    pub sidebar_position: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateTenantRequest {
    #[validate(length(min = 1, max = 200))]
    pub business_name: Option<String>,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub header_font: Option<String>,
    pub body_font: Option<String>,
    pub border_radius: Option<String>,
    pub background_image_url: Option<String>,
    pub favicon_url: Option<String>,
    pub tagline: Option<String>,
    pub website_url: Option<String>,
    pub support_email: Option<String>,
    pub custom_css: Option<String>,
    pub login_background_url: Option<String>,
    pub dashboard_layout: Option<String>,
    pub sidebar_position: Option<String>,
}

/// Tenant response for API consumers.
#[derive(Debug, Serialize)]
pub struct TenantResponse {
    pub id: Uuid,
    pub business_name: String,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub header_font: Option<String>,
    pub body_font: Option<String>,
    pub border_radius: Option<String>,
    pub background_image_url: Option<String>,
    pub favicon_url: Option<String>,
    pub tagline: Option<String>,
    pub website_url: Option<String>,
    pub support_email: Option<String>,
    pub custom_css: Option<String>,
    pub login_background_url: Option<String>,
    pub dashboard_layout: Option<String>,
    pub sidebar_position: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Tenant> for TenantResponse {
    fn from(t: Tenant) -> Self {
        Self {
            id: t.id,
            business_name: t.business_name,
            logo_url: t.logo_url,
            primary_color: t.primary_color,
            secondary_color: t.secondary_color,
            accent_color: t.accent_color,
            header_font: t.header_font,
            body_font: t.body_font,
            border_radius: t.border_radius,
            background_image_url: t.background_image_url,
            favicon_url: t.favicon_url,
            tagline: t.tagline,
            website_url: t.website_url,
            support_email: t.support_email,
            custom_css: t.custom_css,
            login_background_url: t.login_background_url,
            dashboard_layout: t.dashboard_layout,
            sidebar_position: t.sidebar_position,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}
