-- Migration 007: Create chat messages table

CREATE TABLE chatmessages (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID            NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT            NOT NULL,
    content_type    content_type    DEFAULT 'text',
    is_pinned       BOOLEAN         DEFAULT false,
    is_off_topic    BOOLEAN         DEFAULT false,
    is_deleted      BOOLEAN         DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_chatmessages_room_created ON chatmessages (room_id, created_at);
