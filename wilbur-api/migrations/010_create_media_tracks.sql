-- Migration 010: Create media tracks table

CREATE TABLE media_tracks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id    VARCHAR     NOT NULL,
    track_type  track_type  NOT NULL,
    is_active   BOOLEAN     DEFAULT true,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
