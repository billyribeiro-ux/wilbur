use std::sync::Arc;

use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Router,
};
use serde_json::{json, Value};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{AppError, AppResult},
    extractors::{
        auth::AuthUser,
        pagination::PaginationParams,
        room_access::{require_room_host, require_room_moderator},
    },
    models::{
        membership::{MemberRole, MemberStatus, MembershipResponse, RoomMembership, UpdateMemberRoleRequest},
        room::{CreateRoomRequest, Room, RoomResponse, UpdateRoomRequest},
    },
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_rooms))
        .route("/", post(create_room))
        .route("/by-tenant/:tenant_id", get(list_rooms_by_tenant))
        .route("/:id", get(get_room))
        .route("/:id", put(update_room))
        .route("/:id", delete(delete_room))
        .route("/:id/members", get(list_members))
        .route("/:id/members", post(invite_member))
        .route("/:id/members/:user_id", delete(remove_member))
        .route("/:id/members/:user_id/role", put(update_member_role))
}

/// GET / -- list all rooms (paginated).
async fn list_rooms(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Vec<RoomResponse>>> {
    let rooms = sqlx::query_as::<_, Room>(
        "SELECT * FROM rooms WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(pagination.limit())
    .bind(pagination.offset())
    .fetch_all(&state.pool)
    .await?;

    let results: Vec<RoomResponse> = rooms.into_iter().map(RoomResponse::from).collect();
    Ok(Json(results))
}

/// POST / -- create a new room.
async fn create_room(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateRoomRequest>,
) -> AppResult<(StatusCode, Json<RoomResponse>)> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let room_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let room = sqlx::query_as::<_, Room>(
        r#"
        INSERT INTO rooms (id, tenant_id, name, title, description, max_members,
                           background_image_url, header_color, accent_color,
                           font_family, border_style, shadow_style,
                           is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(body.tenant_id)
    .bind(&body.name)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.max_members.unwrap_or(100))
    .bind(&body.background_image_url)
    .bind(&body.header_color)
    .bind(&body.accent_color)
    .bind(&body.font_family)
    .bind(&body.border_style)
    .bind(&body.shadow_style)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    // Auto-add creator as Host member
    sqlx::query(
        r#"
        INSERT INTO room_memberships (id, user_id, room_id, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(auth_user.id)
    .bind(room_id)
    .bind(MemberRole::Host)
    .bind(MemberStatus::Active)
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(RoomResponse::from(room))))
}

/// GET /:id -- get a single room by ID.
async fn get_room(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RoomResponse>> {
    let room = sqlx::query_as::<_, Room>("SELECT * FROM rooms WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Room not found".into()))?;

    Ok(Json(RoomResponse::from(room)))
}

/// PUT /:id -- update a room.
async fn update_room(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateRoomRequest>,
) -> AppResult<Json<RoomResponse>> {
    // Only host or moderator can update a room
    require_room_moderator(&state.pool, auth_user.id, id).await?;

    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let room = sqlx::query_as::<_, Room>(
        r#"
        UPDATE rooms SET
            name                 = COALESCE($1, name),
            title                = COALESCE($2, title),
            description          = COALESCE($3, description),
            max_members          = COALESCE($4, max_members),
            is_active            = COALESCE($5, is_active),
            background_image_url = COALESCE($6, background_image_url),
            header_color         = COALESCE($7, header_color),
            accent_color         = COALESCE($8, accent_color),
            font_family          = COALESCE($9, font_family),
            border_style         = COALESCE($10, border_style),
            shadow_style         = COALESCE($11, shadow_style),
            updated_at           = NOW()
        WHERE id = $12
        RETURNING *
        "#,
    )
    .bind(&body.name)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.max_members)
    .bind(body.is_active)
    .bind(&body.background_image_url)
    .bind(&body.header_color)
    .bind(&body.accent_color)
    .bind(&body.font_family)
    .bind(&body.border_style)
    .bind(&body.shadow_style)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Room not found".into()))?;

    Ok(Json(RoomResponse::from(room)))
}

/// DELETE /:id -- soft-delete a room by deactivating it.
async fn delete_room(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    // Only the host can delete a room
    require_room_host(&state.pool, auth_user.id, id).await?;

    let result = sqlx::query("UPDATE rooms SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Room not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// GET /:id/members -- list members of a room.
async fn list_members(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<MembershipResponse>>> {
    let members = sqlx::query_as::<_, RoomMembership>(
        "SELECT * FROM room_memberships WHERE room_id = $1 ORDER BY created_at ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    let results: Vec<MembershipResponse> = members.into_iter().map(MembershipResponse::from).collect();
    Ok(Json(results))
}

/// POST /:id/members -- invite/add a member to a room.
async fn invite_member(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<Value>,
) -> AppResult<(StatusCode, Json<MembershipResponse>)> {
    // Only host or moderator can invite members
    require_room_moderator(&state.pool, auth_user.id, id).await?;

    let user_id = body
        .get("user_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::BadRequest("Missing or invalid user_id".into()))?;

    let now = chrono::Utc::now();
    let membership = sqlx::query_as::<_, RoomMembership>(
        r#"
        INSERT INTO room_memberships (id, user_id, room_id, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, room_id) DO UPDATE SET status = $5, updated_at = $7
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(id)
    .bind(MemberRole::Member)
    .bind(MemberStatus::Active)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(MembershipResponse::from(membership))))
}

/// DELETE /:id/members/:user_id -- remove a member from a room.
async fn remove_member(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, user_id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    // Only host or moderator can remove members
    require_room_moderator(&state.pool, auth_user.id, room_id).await?;

    // Cannot remove yourself
    if auth_user.id == user_id {
        return Err(AppError::BadRequest("You cannot remove yourself from the room".into()));
    }

    let result = sqlx::query(
        "DELETE FROM room_memberships WHERE room_id = $1 AND user_id = $2",
    )
    .bind(room_id)
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Membership not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// PUT /:id/members/:user_id/role -- update a member's role.
async fn update_member_role(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path((room_id, user_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateMemberRoleRequest>,
) -> AppResult<Json<MembershipResponse>> {
    // Only the host can change member roles
    require_room_host(&state.pool, auth_user.id, room_id).await?;

    let membership = sqlx::query_as::<_, RoomMembership>(
        r#"
        UPDATE room_memberships SET role = $1, updated_at = NOW()
        WHERE room_id = $2 AND user_id = $3
        RETURNING *
        "#,
    )
    .bind(&body.role)
    .bind(room_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Membership not found".into()))?;

    Ok(Json(MembershipResponse::from(membership)))
}

/// GET /by-tenant/:tenant_id -- list rooms belonging to a tenant.
async fn list_rooms_by_tenant(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(tenant_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Vec<RoomResponse>>> {
    let rooms = sqlx::query_as::<_, Room>(
        r#"
        SELECT * FROM rooms
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(tenant_id)
    .bind(pagination.limit())
    .bind(pagination.offset())
    .fetch_all(&state.pool)
    .await?;

    let results: Vec<RoomResponse> = rooms.into_iter().map(RoomResponse::from).collect();
    Ok(Json(results))
}
