use sqlx::PgPool;
use uuid::Uuid;

use crate::models::private_chat::{PrivateChat, PrivateMessage};

pub async fn list_for_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<PrivateChat>, sqlx::Error> {
    sqlx::query_as::<_, PrivateChat>(
        "SELECT * FROM private_chats WHERE participant_one = $1 OR participant_two = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

pub async fn find_or_create(
    pool: &PgPool,
    user_a: Uuid,
    user_b: Uuid,
) -> Result<PrivateChat, sqlx::Error> {
    let (p1, p2) = if user_a < user_b {
        (user_a, user_b)
    } else {
        (user_b, user_a)
    };

    sqlx::query_as::<_, PrivateChat>(
        r#"
        INSERT INTO private_chats (id, participant_one, participant_two)
        VALUES (gen_random_uuid(), $1, $2)
        ON CONFLICT (participant_one, participant_two) DO UPDATE SET participant_one = $1
        RETURNING *
        "#,
    )
    .bind(p1)
    .bind(p2)
    .fetch_one(pool)
    .await
}

pub async fn get_messages(
    pool: &PgPool,
    chat_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<PrivateMessage>, sqlx::Error> {
    sqlx::query_as::<_, PrivateMessage>(
        "SELECT * FROM private_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(chat_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub async fn send_message(
    pool: &PgPool,
    chat_id: Uuid,
    sender_id: Uuid,
    content: &str,
) -> Result<PrivateMessage, sqlx::Error> {
    sqlx::query_as::<_, PrivateMessage>(
        r#"
        INSERT INTO private_messages (id, chat_id, sender_id, content)
        VALUES (gen_random_uuid(), $1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(chat_id)
    .bind(sender_id)
    .bind(content)
    .fetch_one(pool)
    .await
}

pub async fn find_by_users(
    pool: &PgPool,
    user_a: Uuid,
    user_b: Uuid,
) -> Result<Option<PrivateChat>, sqlx::Error> {
    let (p1, p2) = if user_a < user_b {
        (user_a, user_b)
    } else {
        (user_b, user_a)
    };

    sqlx::query_as::<_, PrivateChat>(
        "SELECT * FROM private_chats WHERE participant_one = $1 AND participant_two = $2",
    )
    .bind(p1)
    .bind(p2)
    .fetch_optional(pool)
    .await
}
