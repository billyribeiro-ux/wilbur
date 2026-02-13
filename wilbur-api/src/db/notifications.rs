use sqlx::PgPool;
use uuid::Uuid;

use crate::models::notification::Notification;

pub async fn list_by_user(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<Notification>, sqlx::Error> {
    sqlx::query_as::<_, Notification>(
        "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub async fn mark_read(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE notifications SET is_read = true WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn mark_all_read(pool: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE notifications SET is_read = true WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM notifications WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn create(
    pool: &PgPool,
    user_id: Uuid,
    title: &str,
    body: &str,
    notification_type: &str,
    data: Option<serde_json::Value>,
) -> Result<Notification, sqlx::Error> {
    sqlx::query_as::<_, Notification>(
        r#"
        INSERT INTO notifications (id, user_id, title, body, notification_type, data)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(title)
    .bind(body)
    .bind(notification_type)
    .bind(data)
    .fetch_one(pool)
    .await
}
