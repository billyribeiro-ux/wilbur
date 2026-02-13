use sqlx::PgPool;
use uuid::Uuid;

use crate::models::message::{ChatMessage, ChatMessageWithUser};

pub async fn list_by_room(
    pool: &PgPool,
    room_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<ChatMessageWithUser>, sqlx::Error> {
    sqlx::query_as::<_, ChatMessageWithUser>(
        r#"
        SELECT m.*, u.display_name AS user_display_name, u.avatar_url AS user_avatar_url
        FROM chatmessages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1 AND m.is_deleted = false
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(room_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    room_id: Uuid,
    user_id: Uuid,
    content: &str,
    content_type: &str,
) -> Result<ChatMessage, sqlx::Error> {
    sqlx::query_as::<_, ChatMessage>(
        r#"
        INSERT INTO chatmessages (id, room_id, user_id, content, content_type)
        VALUES (gen_random_uuid(), $1, $2, $3, $4::content_type)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(user_id)
    .bind(content)
    .bind(content_type)
    .fetch_one(pool)
    .await
}

pub async fn soft_delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE chatmessages SET is_deleted = true, deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn pin(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE chatmessages SET is_pinned = true WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn unpin(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE chatmessages SET is_pinned = false WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn mark_off_topic(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE chatmessages SET is_off_topic = true WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
