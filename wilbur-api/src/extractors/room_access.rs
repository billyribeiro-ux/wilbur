use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::membership::{MemberRole, MemberStatus, RoomMembership},
};

/// Verify the user has an active membership in the given room.
/// Returns the `RoomMembership` on success or `AppError::Forbidden` if not a member.
pub async fn require_room_member(
    pool: &PgPool,
    user_id: Uuid,
    room_id: Uuid,
) -> AppResult<RoomMembership> {
    let membership = sqlx::query_as::<_, RoomMembership>(
        "SELECT * FROM room_memberships WHERE user_id = $1 AND room_id = $2",
    )
    .bind(user_id)
    .bind(room_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Forbidden("You are not a member of this room".into()))?;

    if membership.status != MemberStatus::Active {
        return Err(AppError::Forbidden(
            "Your membership in this room is not active".into(),
        ));
    }

    Ok(membership)
}

/// Verify the user is a host or moderator in the given room.
/// Returns the `RoomMembership` on success or `AppError::Forbidden` if insufficient role.
pub async fn require_room_moderator(
    pool: &PgPool,
    user_id: Uuid,
    room_id: Uuid,
) -> AppResult<RoomMembership> {
    let membership = require_room_member(pool, user_id, room_id).await?;

    match membership.role {
        MemberRole::Host | MemberRole::Moderator => Ok(membership),
        _ => Err(AppError::Forbidden(
            "Only hosts and moderators can perform this action".into(),
        )),
    }
}

/// Verify the user is the host of the given room.
/// Returns the `RoomMembership` on success or `AppError::Forbidden` if not host.
pub async fn require_room_host(
    pool: &PgPool,
    user_id: Uuid,
    room_id: Uuid,
) -> AppResult<RoomMembership> {
    let membership = require_room_member(pool, user_id, room_id).await?;

    if membership.role != MemberRole::Host {
        return Err(AppError::Forbidden(
            "Only the host can perform this action".into(),
        ));
    }

    Ok(membership)
}
