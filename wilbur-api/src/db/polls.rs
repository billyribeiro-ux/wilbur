use sqlx::PgPool;
use uuid::Uuid;

use crate::models::poll::{Poll, PollVote};

pub async fn list_by_room(pool: &PgPool, room_id: Uuid) -> Result<Vec<Poll>, sqlx::Error> {
    sqlx::query_as::<_, Poll>(
        "SELECT * FROM polls WHERE room_id = $1 ORDER BY created_at DESC",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    room_id: Uuid,
    creator_id: Uuid,
    question: &str,
    options: serde_json::Value,
    closes_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<Poll, sqlx::Error> {
    sqlx::query_as::<_, Poll>(
        r#"
        INSERT INTO polls (id, room_id, creator_id, question, options, closes_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(creator_id)
    .bind(question)
    .bind(options)
    .bind(closes_at)
    .fetch_one(pool)
    .await
}

pub async fn vote(
    pool: &PgPool,
    poll_id: Uuid,
    user_id: Uuid,
    option_index: i32,
) -> Result<PollVote, sqlx::Error> {
    sqlx::query_as::<_, PollVote>(
        r#"
        INSERT INTO poll_votes (id, poll_id, user_id, option_index)
        VALUES (gen_random_uuid(), $1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(poll_id)
    .bind(user_id)
    .bind(option_index)
    .fetch_one(pool)
    .await
}

pub async fn get_votes(pool: &PgPool, poll_id: Uuid) -> Result<Vec<PollVote>, sqlx::Error> {
    sqlx::query_as::<_, PollVote>("SELECT * FROM poll_votes WHERE poll_id = $1")
        .bind(poll_id)
        .fetch_all(pool)
        .await
}

pub async fn close(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE polls SET status = 'closed' WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM polls WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
