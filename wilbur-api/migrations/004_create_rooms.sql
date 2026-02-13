-- Migration 004: Create rooms table

CREATE TABLE rooms (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        REFERENCES tenants(id) ON DELETE SET NULL,
    name                 VARCHAR     NOT NULL,
    title                VARCHAR,
    description          TEXT,
    max_members          INT         DEFAULT 100,
    is_active            BOOLEAN     DEFAULT true,
    background_image_url TEXT,
    header_color         VARCHAR,
    accent_color         VARCHAR,
    font_family          VARCHAR,
    border_style         VARCHAR,
    shadow_style         VARCHAR,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
