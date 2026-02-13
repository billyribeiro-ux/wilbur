-- Migration 008: Create alerts table

CREATE TABLE alerts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id             UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    author_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR     NOT NULL,
    body                TEXT,
    alert_type          alert_type  DEFAULT 'info',
    ticker_symbol       VARCHAR(20),
    entry_price         NUMERIC(20, 8),
    stop_loss           NUMERIC(20, 8),
    take_profit         NUMERIC(20, 8),
    media_url           TEXT,
    legal_disclosure    TEXT,
    is_active           BOOLEAN     DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_room_created ON alerts (room_id, created_at);
