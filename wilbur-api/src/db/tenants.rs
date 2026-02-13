use sqlx::PgPool;
use uuid::Uuid;

use crate::models::tenant::Tenant;

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Tenant>, sqlx::Error> {
    sqlx::query_as::<_, Tenant>("SELECT * FROM tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn update(
    pool: &PgPool,
    id: Uuid,
    business_name: Option<&str>,
    logo_url: Option<&str>,
    primary_color: Option<&str>,
    secondary_color: Option<&str>,
    accent_color: Option<&str>,
    header_font: Option<&str>,
    body_font: Option<&str>,
    border_radius: Option<&str>,
    background_image_url: Option<&str>,
    favicon_url: Option<&str>,
    tagline: Option<&str>,
    website_url: Option<&str>,
    support_email: Option<&str>,
    custom_css: Option<&str>,
    login_background_url: Option<&str>,
    dashboard_layout: Option<&str>,
    sidebar_position: Option<&str>,
) -> Result<Tenant, sqlx::Error> {
    sqlx::query_as::<_, Tenant>(
        r#"
        UPDATE tenants
        SET business_name = COALESCE($2, business_name),
            logo_url = COALESCE($3, logo_url),
            primary_color = COALESCE($4, primary_color),
            secondary_color = COALESCE($5, secondary_color),
            accent_color = COALESCE($6, accent_color),
            header_font = COALESCE($7, header_font),
            body_font = COALESCE($8, body_font),
            border_radius = COALESCE($9, border_radius),
            background_image_url = COALESCE($10, background_image_url),
            favicon_url = COALESCE($11, favicon_url),
            tagline = COALESCE($12, tagline),
            website_url = COALESCE($13, website_url),
            support_email = COALESCE($14, support_email),
            custom_css = COALESCE($15, custom_css),
            login_background_url = COALESCE($16, login_background_url),
            dashboard_layout = COALESCE($17, dashboard_layout),
            sidebar_position = COALESCE($18, sidebar_position),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(business_name)
    .bind(logo_url)
    .bind(primary_color)
    .bind(secondary_color)
    .bind(accent_color)
    .bind(header_font)
    .bind(body_font)
    .bind(border_radius)
    .bind(background_image_url)
    .bind(favicon_url)
    .bind(tagline)
    .bind(website_url)
    .bind(support_email)
    .bind(custom_css)
    .bind(login_background_url)
    .bind(dashboard_layout)
    .bind(sidebar_position)
    .fetch_one(pool)
    .await
}
