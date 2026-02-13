-- Migration 003: Create tenants table for multi-tenant branding

CREATE TABLE tenants (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name        VARCHAR     NOT NULL,
    logo_url             TEXT,
    primary_color        VARCHAR,
    secondary_color      VARCHAR,
    accent_color         VARCHAR,
    header_font          VARCHAR,
    body_font            VARCHAR,
    border_radius        VARCHAR,
    background_image_url TEXT,
    favicon_url          TEXT,
    tagline              TEXT,
    website_url          TEXT,
    support_email        VARCHAR,
    custom_css           TEXT,
    login_background_url TEXT,
    dashboard_layout     VARCHAR,
    sidebar_position     VARCHAR,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
