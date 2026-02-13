use sqlx::PgPool;
use uuid::Uuid;

use crate::models::room::Room;

pub async fn list(pool: &PgPool, limit: i64, offset: i64) -> Result<Vec<Room>, sqlx::Error> {
    sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Room>, sqlx::Error> {
    sqlx::query_as::<_, Room>("SELECT * FROM rooms WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn create(
    pool: &PgPool,
    tenant_id: Option<Uuid>,
    name: &str,
    title: Option<&str>,
    description: Option<&str>,
) -> Result<Room, sqlx::Error> {
    sqlx::query_as::<_, Room>(
        r#"
        INSERT INTO rooms (id, tenant_id, name, title, description)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(tenant_id)
    .bind(name)
    .bind(title)
    .bind(description)
    .fetch_one(pool)
    .await
}

pub async fn update(
    pool: &PgPool,
    id: Uuid,
    name: Option<&str>,
    title: Option<&str>,
    description: Option<&str>,
) -> Result<Room, sqlx::Error> {
    sqlx::query_as::<_, Room>(
        r#"
        UPDATE rooms
        SET name = COALESCE($2, name),
            title = COALESCE($3, title),
            description = COALESCE($4, description)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(title)
    .bind(description)
    .fetch_one(pool)
    .await
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE rooms SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn list_by_tenant(
    pool: &PgPool,
    tenant_id: Uuid,
) -> Result<Vec<Room>, sqlx::Error> {
    sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(pool)
    .await
}
