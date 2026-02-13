use sqlx::PgPool;
use uuid::Uuid;

use crate::models::storage::{Note, RoomFile};

pub async fn list_files(pool: &PgPool, room_id: Uuid) -> Result<Vec<RoomFile>, sqlx::Error> {
    sqlx::query_as::<_, RoomFile>(
        "SELECT * FROM room_files WHERE room_id = $1 ORDER BY created_at DESC",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn create_file(
    pool: &PgPool,
    room_id: Uuid,
    uploaded_by: Uuid,
    file_name: &str,
    file_url: &str,
    file_size: i64,
    mime_type: &str,
) -> Result<RoomFile, sqlx::Error> {
    sqlx::query_as::<_, RoomFile>(
        r#"
        INSERT INTO room_files (id, room_id, uploaded_by, file_name, file_url, file_size, mime_type)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(uploaded_by)
    .bind(file_name)
    .bind(file_url)
    .bind(file_size)
    .bind(mime_type)
    .fetch_one(pool)
    .await
}

pub async fn list_notes(pool: &PgPool, room_id: Uuid) -> Result<Vec<Note>, sqlx::Error> {
    sqlx::query_as::<_, Note>(
        "SELECT * FROM notes WHERE room_id = $1 ORDER BY updated_at DESC",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn create_note(
    pool: &PgPool,
    room_id: Uuid,
    user_id: Uuid,
    title: &str,
    content: &str,
) -> Result<Note, sqlx::Error> {
    sqlx::query_as::<_, Note>(
        r#"
        INSERT INTO notes (id, room_id, user_id, title, content)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(user_id)
    .bind(title)
    .bind(content)
    .fetch_one(pool)
    .await
}
