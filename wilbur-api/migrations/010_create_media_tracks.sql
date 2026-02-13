-- Migration 010: Create media tracks table

CREATE TABLE media_tracks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id        VARCHAR     NOT NULL,
    track_type      track_type  NOT NULL,
    track_sid       VARCHAR,
    is_active       BOOLEAN     DEFAULT true,
    muted           BOOLEAN     DEFAULT false,
    metadata        JSONB,
    last_heartbeat  TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_tracks_room_active ON media_tracks (room_id, is_active);
