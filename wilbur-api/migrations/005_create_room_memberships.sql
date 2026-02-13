-- Migration 005: Create room memberships table

CREATE TABLE room_memberships (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id     UUID            NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    role        member_role     DEFAULT 'member',
    status      member_status   DEFAULT 'active',
    city        VARCHAR,
    state_name  VARCHAR,
    country     VARCHAR,
    created_at  TIMESTAMPTZ     DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     DEFAULT NOW(),

    CONSTRAINT uq_room_memberships_user_room UNIQUE (user_id, room_id)
);
