use sqlx::PgPool;
use uuid::Uuid;

use crate::models::media_track::MediaTrack;

pub async fn list_by_room(pool: &PgPool, room_id: Uuid) -> Result<Vec<MediaTrack>, sqlx::Error> {
    sqlx::query_as::<_, MediaTrack>(
        "SELECT * FROM media_tracks WHERE room_id = $1 AND is_active = true LIMIT 200",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    room_id: Uuid,
    user_id: Uuid,
    track_id: &str,
    track_type: &str,
    metadata: Option<serde_json::Value>,
) -> Result<MediaTrack, sqlx::Error> {
    sqlx::query_as::<_, MediaTrack>(
        r#"
        INSERT INTO media_tracks (id, room_id, user_id, track_id, track_type, metadata)
        VALUES (gen_random_uuid(), $1, $2, $3, $4::track_type, $5)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(user_id)
    .bind(track_id)
    .bind(track_type)
    .bind(metadata)
    .fetch_one(pool)
    .await
}

pub async fn deactivate(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE media_tracks SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn cleanup_inactive(pool: &PgPool, room_id: Uuid) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM media_tracks WHERE room_id = $1 AND is_active = false")
        .bind(room_id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}
