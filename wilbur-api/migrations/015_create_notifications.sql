-- Migration 015: Create notifications table

CREATE TABLE notifications (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR     NOT NULL,
    body                TEXT        NOT NULL,
    notification_type   VARCHAR     NOT NULL,
    is_read             BOOLEAN     DEFAULT false,
    data                JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at);
