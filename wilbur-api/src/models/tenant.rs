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
    pub background_color: Option<String>,
    pub text_color: Option<String>,
    pub font_family: Option<String>,
    pub header_font_family: Option<String>,
    pub border_radius: Option<String>,
    pub button_style: Option<String>,
    pub card_style: Option<String>,
    pub favicon_url: Option<String>,
    pub banner_url: Option<String>,
    pub custom_css: Option<String>,
    pub email_header_url: Option<String>,
    pub email_footer_text: Option<String>,
    pub landing_page_url: Option<String>,
    pub terms_url: Option<String>,
    pub privacy_url: Option<String>,
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
    pub background_color: Option<String>,
    pub text_color: Option<String>,
    pub font_family: Option<String>,
    pub header_font_family: Option<String>,
    pub border_radius: Option<String>,
    pub button_style: Option<String>,
    pub card_style: Option<String>,
    pub favicon_url: Option<String>,
    pub banner_url: Option<String>,
    pub custom_css: Option<String>,
    pub email_header_url: Option<String>,
    pub email_footer_text: Option<String>,
    pub landing_page_url: Option<String>,
    pub terms_url: Option<String>,
    pub privacy_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateTenantRequest {
    #[validate(length(min = 1, max = 200))]
    pub business_name: Option<String>,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_color: Option<String>,
    pub background_color: Option<String>,
    pub text_color: Option<String>,
    pub font_family: Option<String>,
    pub header_font_family: Option<String>,
    pub border_radius: Option<String>,
    pub button_style: Option<String>,
    pub card_style: Option<String>,
    pub favicon_url: Option<String>,
    pub banner_url: Option<String>,
    pub custom_css: Option<String>,
    pub email_header_url: Option<String>,
    pub email_footer_text: Option<String>,
    pub landing_page_url: Option<String>,
    pub terms_url: Option<String>,
    pub privacy_url: Option<String>,
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
    pub background_color: Option<String>,
    pub text_color: Option<String>,
    pub font_family: Option<String>,
    pub header_font_family: Option<String>,
    pub border_radius: Option<String>,
    pub button_style: Option<String>,
    pub card_style: Option<String>,
    pub favicon_url: Option<String>,
    pub banner_url: Option<String>,
    pub custom_css: Option<String>,
    pub email_header_url: Option<String>,
    pub email_footer_text: Option<String>,
    pub landing_page_url: Option<String>,
    pub terms_url: Option<String>,
    pub privacy_url: Option<String>,
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
            background_color: t.background_color,
            text_color: t.text_color,
            font_family: t.font_family,
            header_font_family: t.header_font_family,
            border_radius: t.border_radius,
            button_style: t.button_style,
            card_style: t.card_style,
            favicon_url: t.favicon_url,
            banner_url: t.banner_url,
            custom_css: t.custom_css,
            email_header_url: t.email_header_url,
            email_footer_text: t.email_footer_text,
            landing_page_url: t.landing_page_url,
            terms_url: t.terms_url,
            privacy_url: t.privacy_url,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}
