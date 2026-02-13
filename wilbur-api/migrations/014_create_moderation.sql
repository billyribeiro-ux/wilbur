-- Migration 014: Create moderation tables (bans, moderation log, reported content)

CREATE TABLE banned_users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_banned_users_room_user UNIQUE (room_id, user_id)
);

CREATE TABLE moderation_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    moderator_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action          VARCHAR     NOT NULL,
    details         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reported_content (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID            NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reporter_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type    VARCHAR         NOT NULL,
    content_id      UUID            NOT NULL,
    reason          TEXT            NOT NULL,
    status          report_status   DEFAULT 'pending',
    reviewed_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);
