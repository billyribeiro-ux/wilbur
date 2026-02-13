-- Migration 013: Create user themes table

CREATE TABLE user_themes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR     NOT NULL,
    theme_data  JSONB       NOT NULL,
    is_active   BOOLEAN     DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
