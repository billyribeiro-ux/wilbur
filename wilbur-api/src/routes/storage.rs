use std::sync::Arc;

use axum::{
    extract::{Json, Multipart, Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

#[derive(Debug, FromRow, Serialize)]
struct RoomFile {
    id: Uuid,
    room_id: Uuid,
    uploaded_by: Uuid,
    file_name: String,
    file_url: String,
    file_size: i64,
    mime_type: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize)]
struct Note {
    id: Uuid,
    room_id: Uuid,
    user_id: Uuid,
    title: String,
    content: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub(crate) const MAX_UPLOAD_SIZE: usize = 50 * 1024 * 1024; // 50MB

pub(crate) const ALLOWED_CONTENT_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/octet-stream",
];

pub(crate) const ALLOWED_MEDIA_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
];

/// Sanitize a filename by stripping directory components and dangerous characters
/// to prevent path traversal attacks.
pub(crate) fn sanitize_filename(raw: &str) -> String {
    let name = raw
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("upload.bin")
        .replace("..", "")
        .trim_matches('.')
        .to_string();
    if name.is_empty() {
        "upload.bin".to_string()
    } else {
        name
    }
}

/// Validate an upload's size and content type against an allowlist.
pub(crate) fn validate_upload(
    data_len: usize,
    content_type: &str,
    allowed_types: &[&str],
) -> AppResult<()> {
    if data_len > MAX_UPLOAD_SIZE {
        return Err(AppError::BadRequest(
            "File exceeds maximum size of 50MB".into(),
        ));
    }
    if !allowed_types.contains(&content_type) {
        return Err(AppError::BadRequest(format!(
            "File type '{}' is not allowed",
            content_type
        )));
    }
    Ok(())
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/upload", post(upload_file))
        .route("/files/:id", get(serve_file))
        .route("/files/:id", delete(delete_file))
        .route("/rooms/:room_id/files", get(list_room_files))
        .route("/rooms/:room_id/files", post(create_room_file))
        .route("/rooms/:room_id/notes", get(list_room_notes))
        .route("/rooms/:room_id/notes", post(create_room_note))
}

#[derive(Debug, Serialize)]
struct FileResponse {
    id: Uuid,
    filename: String,
    content_type: String,
    size: i64,
    url: String,
}

#[derive(Debug, Deserialize)]
struct CreateNoteRequest {
    title: String,
    content: String,
}

/// POST /upload -- upload a file via multipart.
async fn upload_file(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> AppResult<(StatusCode, Json<Value>)> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        if field.name() == Some("file") {
            let raw_name = field
                .file_name()
                .unwrap_or("upload.bin")
                .to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;

            let file_name = sanitize_filename(&raw_name);
            validate_upload(data.len(), &content_type, ALLOWED_CONTENT_TYPES)?;

            let file_id = Uuid::new_v4();
            let key = format!("uploads/{}/{}/{}", auth_user.id, file_id, file_name);
            let size = data.len() as i64;

            state
                .s3
                .put_object()
                .bucket(&state.config.s3_bucket)
                .key(&key)
                .body(data.into())
                .content_type(&content_type)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 upload failed: {e}")))?;

            let url = format!("{}/{}/{}", state.config.s3_endpoint, state.config.s3_bucket, key);

            return Ok((
                StatusCode::CREATED,
                Json(json!({
                    "id": file_id,
                    "filename": file_name,
                    "content_type": content_type,
                    "size": size,
                    "url": url,
                    "uploaded_by": auth_user.id
                })),
            ));
        }
    }

    Err(AppError::BadRequest("No file field found in multipart body".into()))
}

/// GET /files/:id -- look up a file record and return its details.
async fn serve_file(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RoomFile>> {
    let file = sqlx::query_as::<_, RoomFile>("SELECT * FROM room_files WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("File not found".into()))?;

    Ok(Json(file))
}

/// DELETE /files/:id -- delete a file (only the uploader can delete).
async fn delete_file(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let result = sqlx::query("DELETE FROM room_files WHERE id = $1 AND uploaded_by = $2")
        .bind(id)
        .bind(auth_user.id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("File not found or not owned by you".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// GET /rooms/:room_id/files -- list files for a room.
async fn list_room_files(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Vec<RoomFile>>> {
    let files = sqlx::query_as::<_, RoomFile>(
        "SELECT * FROM room_files WHERE room_id = $1 ORDER BY created_at DESC LIMIT 100",
    )
    .bind(room_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(files))
}

/// POST /rooms/:room_id/files -- associate a file with a room.
async fn create_room_file(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<(StatusCode, Json<Value>)> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        if field.name() == Some("file") {
            let raw_name = field
                .file_name()
                .unwrap_or("upload.bin")
                .to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;

            let file_name = sanitize_filename(&raw_name);
            validate_upload(data.len(), &content_type, ALLOWED_CONTENT_TYPES)?;

            let size = data.len() as i64;
            let file_id = Uuid::new_v4();
            let key = format!("rooms/{}/files/{}/{}", room_id, file_id, file_name);

            state
                .s3
                .put_object()
                .bucket(&state.config.s3_bucket)
                .key(&key)
                .body(data.into())
                .content_type(&content_type)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 upload failed: {e}")))?;

            let url = format!("{}/{}/{}", state.config.s3_endpoint, state.config.s3_bucket, key);

            // Store file record in DB
            let file = sqlx::query_as::<_, RoomFile>(
                r#"
                INSERT INTO room_files (id, room_id, uploaded_by, file_name, file_url, file_size, mime_type, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING *
                "#,
            )
            .bind(file_id)
            .bind(room_id)
            .bind(auth_user.id)
            .bind(&file_name)
            .bind(&url)
            .bind(size)
            .bind(&content_type)
            .fetch_one(&state.pool)
            .await?;

            return Ok((StatusCode::CREATED, Json(serde_json::to_value(file).unwrap_or_default())));
        }
    }

    Err(AppError::BadRequest("No file field found in multipart body".into()))
}

/// GET /rooms/:room_id/notes -- list notes for a room.
async fn list_room_notes(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Vec<Note>>> {
    let notes = sqlx::query_as::<_, Note>(
        "SELECT * FROM notes WHERE room_id = $1 ORDER BY created_at DESC LIMIT 100",
    )
    .bind(room_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(notes))
}

/// POST /rooms/:room_id/notes -- create a note in a room.
async fn create_room_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateNoteRequest>,
) -> AppResult<(StatusCode, Json<Note>)> {
    let note = sqlx::query_as::<_, Note>(
        r#"
        INSERT INTO notes (id, room_id, user_id, title, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(room_id)
    .bind(auth_user.id)
    .bind(&body.title)
    .bind(&body.content)
    .fetch_one(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(note)))
}
