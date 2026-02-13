use std::sync::Arc;

use axum::{
    extract::{Json, Multipart, Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::auth::AuthUser,
    state::AppState,
};

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
            let file_name = field
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

/// GET /files/:id -- serve/redirect to a file.
async fn serve_file(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "serve_file",
        "file_id": id
    })))
}

/// DELETE /files/:id -- delete a file.
async fn delete_file(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    Ok(StatusCode::NO_CONTENT)
}

/// GET /rooms/:room_id/files -- list files for a room.
async fn list_room_files(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_room_files",
        "room_id": room_id,
        "files": []
    })))
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
            let file_name = field
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

            return Ok((
                StatusCode::CREATED,
                Json(json!({
                    "id": file_id,
                    "room_id": room_id,
                    "filename": file_name,
                    "content_type": content_type,
                    "url": url,
                    "uploaded_by": auth_user.id
                })),
            ));
        }
    }

    Err(AppError::BadRequest("No file field found in multipart body".into()))
}

/// GET /rooms/:room_id/notes -- list notes for a room.
async fn list_room_notes(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "endpoint": "list_room_notes",
        "room_id": room_id,
        "notes": []
    })))
}

/// POST /rooms/:room_id/notes -- create a note in a room.
async fn create_room_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateNoteRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let note_id = Uuid::new_v4();

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": note_id,
            "room_id": room_id,
            "user_id": auth_user.id,
            "title": body.title,
            "content": body.content,
            "endpoint": "create_room_note"
        })),
    ))
}
