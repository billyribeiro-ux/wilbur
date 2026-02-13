use sqlx::PgPool;
use uuid::Uuid;

pub async fn get_system_config(
    pool: &PgPool,
    key: &str,
) -> Result<Option<serde_json::Value>, sqlx::Error> {
    sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT value FROM system_configuration WHERE key = $1",
    )
    .bind(key)
    .fetch_optional(pool)
    .await
}

pub async fn set_system_config(
    pool: &PgPool,
    key: &str,
    value: serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO system_configuration (id, key, value)
        VALUES (gen_random_uuid(), $1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2
        "#,
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_tenant_config(
    pool: &PgPool,
    tenant_id: Uuid,
    key: &str,
) -> Result<Option<serde_json::Value>, sqlx::Error> {
    sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT value FROM tenant_configuration WHERE tenant_id = $1 AND key = $2",
    )
    .bind(tenant_id)
    .bind(key)
    .fetch_optional(pool)
    .await
}

pub async fn set_tenant_config(
    pool: &PgPool,
    tenant_id: Uuid,
    key: &str,
    value: serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO tenant_configuration (id, tenant_id, key, value)
        VALUES (gen_random_uuid(), $1, $2, $3)
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3
        "#,
    )
    .bind(tenant_id)
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}
