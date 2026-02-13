-- Migration 018: Create branding audit log table

CREATE TABLE branding_audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    changed_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name  VARCHAR     NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
