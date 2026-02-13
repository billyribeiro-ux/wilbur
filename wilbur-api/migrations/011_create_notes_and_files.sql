-- Migration 011: Create notes and room files tables

CREATE TABLE notes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR     NOT NULL,
    content     TEXT        DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_files (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    uploaded_by     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       VARCHAR     NOT NULL,
    file_url        TEXT        NOT NULL,
    file_size       BIGINT      DEFAULT 0,
    mime_type       VARCHAR     DEFAULT 'application/octet-stream',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
