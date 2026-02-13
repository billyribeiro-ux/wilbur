-- Migration 016: Create private chats and private messages tables

CREATE TABLE private_chats (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_two     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure participant_one always has the smaller UUID to prevent duplicate pairs
    CONSTRAINT chk_private_chats_participant_order CHECK (participant_one < participant_two),
    CONSTRAINT uq_private_chats_participants UNIQUE (participant_one, participant_two)
);

CREATE TABLE private_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID        NOT NULL REFERENCES private_chats(id) ON DELETE CASCADE,
    sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    is_read     BOOLEAN     DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_private_messages_chat_created ON private_messages (chat_id, created_at);
