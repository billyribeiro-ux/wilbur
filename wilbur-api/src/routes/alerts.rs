use std::sync::Arc;

use axum::{
    extract::{Json, Multipart, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Router,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    extractors::{auth::AuthUser, pagination::PaginationParams},
    models::alert::{Alert, AlertResponse, CreateAlertRequest},
    routes::storage::{sanitize_filename, validate_upload, ALLOWED_MEDIA_TYPES},
    state::AppState,
    ws::manager::WsManager,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_alerts))
        .route("/", post(create_alert))
        .route("/:id", delete(delete_alert))
        .route("/:id/media", post(upload_alert_media))
}

/// GET / -- list alerts for a room.
async fn list_alerts(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> AppResult<Json<Value>> {
    let limit = pagination.limit();
    let offset = pagination.offset();

    let alerts = sqlx::query_as::<_, Alert>(
        r#"
        SELECT id, room_id, author_id, title, body, alert_type,
               ticker_symbol, entry_price::float8 as entry_price,
               stop_loss::float8 as stop_loss, take_profit::float8 as take_profit,
               media_url, legal_disclosure, is_active, created_at
        FROM alerts
        WHERE room_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(room_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<AlertResponse> = alerts.into_iter().map(AlertResponse::from).collect();

    Ok(Json(json!({
        "room_id": room_id,
        "page": pagination.page,
        "per_page": pagination.per_page(),
        "data": data
    })))
}

/// POST / -- create a new alert in the room.
async fn create_alert(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(room_id): Path<Uuid>,
    Json(body): Json<CreateAlertRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let alert_id = Uuid::new_v4();

    let alert = sqlx::query_as::<_, Alert>(
        r#"
        INSERT INTO alerts (
            id, room_id, author_id, title, body, alert_type,
            ticker_symbol, entry_price, stop_loss, take_profit,
            media_url, legal_disclosure, is_active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW())
        RETURNING id, room_id, author_id, title, body, alert_type,
                  ticker_symbol, entry_price::float8 as entry_price,
                  stop_loss::float8 as stop_loss, take_profit::float8 as take_profit,
                  media_url, legal_disclosure, is_active, created_at
        "#,
    )
    .bind(alert_id)
    .bind(room_id)
    .bind(auth_user.id)
    .bind(&body.title)
    .bind(&body.body)
    .bind(&body.alert_type)
    .bind(&body.ticker_symbol)
    .bind(body.entry_price)
    .bind(body.stop_loss)
    .bind(body.take_profit)
    .bind(&body.media_url)
    .bind(&body.legal_disclosure)
    .fetch_one(&state.pool)
    .await?;

    let response = AlertResponse::from(alert);
    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;

    // Broadcast to WebSocket channel
    let channel = format!("room:{}:alerts", room_id);
    WsManager::notify_change(&state, &channel, "alert_created", response_json.clone());

    Ok((StatusCode::CREATED, Json(response_json)))
}

/// DELETE /:id -- delete an alert (soft-delete by setting is_active = false).
async fn delete_alert(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    let result = sqlx::query(
        "UPDATE alerts SET is_active = false WHERE id = $1 AND room_id = $2",
    )
    .bind(id)
    .bind(room_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Alert not found".into()));
    }

    // Broadcast deletion to WebSocket channel
    let channel = format!("room:{}:alerts", room_id);
    WsManager::notify_change(
        &state,
        &channel,
        "alert_deleted",
        json!({ "id": id, "room_id": room_id }),
    );

    Ok(StatusCode::NO_CONTENT)
}

/// POST /:id/media -- upload media for an alert via multipart.
async fn upload_alert_media(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path((room_id, id)): Path<(Uuid, Uuid)>,
    mut multipart: Multipart,
) -> AppResult<Json<Value>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        if field.name() == Some("media") {
            let raw_name = field
                .file_name()
                .unwrap_or("media.bin")
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
            validate_upload(data.len(), &content_type, ALLOWED_MEDIA_TYPES)?;

            let key = format!("alerts/{}/{}/{}", room_id, id, file_name);

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

            let media_url = format!("{}/{}/{}", state.config.s3_endpoint, state.config.s3_bucket, key);

            // Update the alert's media_url in the database
            sqlx::query("UPDATE alerts SET media_url = $1 WHERE id = $2 AND room_id = $3")
                .bind(&media_url)
                .bind(id)
                .bind(room_id)
                .execute(&state.pool)
                .await?;

            // Broadcast media update
            let channel = format!("room:{}:alerts", room_id);
            WsManager::notify_change(
                &state,
                &channel,
                "alert_media_uploaded",
                json!({ "id": id, "media_url": media_url }),
            );

            return Ok(Json(json!({ "media_url": media_url })));
        }
    }

    Err(AppError::BadRequest("No media field found in multipart body".into()))
}
