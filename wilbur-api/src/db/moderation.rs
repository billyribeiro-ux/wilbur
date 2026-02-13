use sqlx::PgPool;
use uuid::Uuid;

pub async fn ban_user(
    pool: &PgPool,
    room_id: Uuid,
    user_id: Uuid,
    banned_by: Uuid,
    reason: Option<&str>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO banned_users (id, room_id, user_id, banned_by, reason, expires_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        ON CONFLICT (room_id, user_id) DO UPDATE SET reason = $4, expires_at = $5
        "#,
    )
    .bind(room_id)
    .bind(user_id)
    .bind(banned_by)
    .bind(reason)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    // Update membership status
    sqlx::query("UPDATE room_memberships SET status = 'banned' WHERE room_id = $1 AND user_id = $2")
        .bind(room_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(())
}

pub async fn unban_user(pool: &PgPool, room_id: Uuid, user_id: Uuid) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query("DELETE FROM banned_users WHERE room_id = $1 AND user_id = $2")
        .bind(room_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("UPDATE room_memberships SET status = 'active' WHERE room_id = $1 AND user_id = $2")
        .bind(room_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(())
}

pub async fn log_action(
    pool: &PgPool,
    room_id: Uuid,
    moderator_id: Uuid,
    target_user_id: Uuid,
    action: &str,
    details: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO moderation_log (id, room_id, moderator_id, target_user_id, action, details)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        "#,
    )
    .bind(room_id)
    .bind(moderator_id)
    .bind(target_user_id)
    .bind(action)
    .bind(details)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn report_content(
    pool: &PgPool,
    room_id: Uuid,
    reporter_id: Uuid,
    content_type: &str,
    content_id: Uuid,
    reason: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO reported_content (id, room_id, reporter_id, content_type, content_id, reason)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        "#,
    )
    .bind(room_id)
    .bind(reporter_id)
    .bind(content_type)
    .bind(content_id)
    .bind(reason)
    .execute(pool)
    .await?;
    Ok(())
}
