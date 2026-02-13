-- Migration 009: Create polls and poll votes tables

CREATE TABLE polls (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID            NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    creator_id  UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question    TEXT            NOT NULL,
    options     JSONB           NOT NULL,
    status      poll_status     DEFAULT 'active',
    closes_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TABLE poll_votes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id         UUID        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index    INT         NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_poll_votes_poll_user UNIQUE (poll_id, user_id)
);
