-- Migration 017: Create system and tenant configuration tables

CREATE TABLE system_configuration (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR     UNIQUE NOT NULL,
    value       JSONB       NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_configuration (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key         VARCHAR     NOT NULL,
    value       JSONB       NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_tenant_configuration_tenant_key UNIQUE (tenant_id, key)
);
