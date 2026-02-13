-- Migration 012: Create user integrations table

CREATE TABLE user_integrations (
    id                          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type            integration_type    NOT NULL,
    access_token_encrypted      TEXT                NOT NULL,
    refresh_token_encrypted     TEXT,
    external_user_id            VARCHAR,
    external_username           VARCHAR,
    expires_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ         DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ         DEFAULT NOW(),

    CONSTRAINT uq_user_integrations_user_type UNIQUE (user_id, integration_type)
);
