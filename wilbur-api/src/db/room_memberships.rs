use sqlx::PgPool;
use uuid::Uuid;

use crate::models::membership::RoomMembership;

pub async fn list_by_room(pool: &PgPool, room_id: Uuid) -> Result<Vec<RoomMembership>, sqlx::Error> {
    sqlx::query_as::<_, RoomMembership>(
        "SELECT * FROM room_memberships WHERE room_id = $1 AND status = 'active' ORDER BY created_at LIMIT 200",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn find(pool: &PgPool, user_id: Uuid, room_id: Uuid) -> Result<Option<RoomMembership>, sqlx::Error> {
    sqlx::query_as::<_, RoomMembership>(
        "SELECT * FROM room_memberships WHERE user_id = $1 AND room_id = $2",
    )
    .bind(user_id)
    .bind(room_id)
    .fetch_optional(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    user_id: Uuid,
    room_id: Uuid,
    role: &str,
) -> Result<RoomMembership, sqlx::Error> {
    sqlx::query_as::<_, RoomMembership>(
        r#"
        INSERT INTO room_memberships (id, user_id, room_id, role)
        VALUES (gen_random_uuid(), $1, $2, $3::member_role)
        ON CONFLICT (user_id, room_id) DO UPDATE SET status = 'active', role = $3::member_role
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(room_id)
    .bind(role)
    .fetch_one(pool)
    .await
}

pub async fn remove(pool: &PgPool, user_id: Uuid, room_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM room_memberships WHERE user_id = $1 AND room_id = $2")
        .bind(user_id)
        .bind(room_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_role(
    pool: &PgPool,
    user_id: Uuid,
    room_id: Uuid,
    role: &str,
) -> Result<RoomMembership, sqlx::Error> {
    sqlx::query_as::<_, RoomMembership>(
        "UPDATE room_memberships SET role = $3::member_role WHERE user_id = $1 AND room_id = $2 RETURNING *",
    )
    .bind(user_id)
    .bind(room_id)
    .bind(role)
    .fetch_one(pool)
    .await
}

pub async fn is_member(pool: &PgPool, user_id: Uuid, room_id: Uuid) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM room_memberships WHERE user_id = $1 AND room_id = $2 AND status = 'active')",
    )
    .bind(user_id)
    .bind(room_id)
    .fetch_one(pool)
    .await
}
