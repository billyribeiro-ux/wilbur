use sqlx::PgPool;
use uuid::Uuid;

use crate::models::alert::Alert;

pub async fn list_by_room(pool: &PgPool, room_id: Uuid) -> Result<Vec<Alert>, sqlx::Error> {
    sqlx::query_as::<_, Alert>(
        "SELECT * FROM alerts WHERE room_id = $1 AND is_active = true ORDER BY created_at DESC",
    )
    .bind(room_id)
    .fetch_all(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    room_id: Uuid,
    author_id: Uuid,
    title: &str,
    body: Option<&str>,
    alert_type: &str,
    ticker_symbol: Option<&str>,
    entry_price: Option<f64>,
    stop_loss: Option<f64>,
    take_profit: Option<f64>,
    legal_disclosure: Option<&str>,
) -> Result<Alert, sqlx::Error> {
    sqlx::query_as::<_, Alert>(
        r#"
        INSERT INTO alerts (id, room_id, author_id, title, body, alert_type, ticker_symbol, entry_price, stop_loss, take_profit, legal_disclosure)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::alert_type, $6, $7, $8, $9, $10)
        RETURNING *
        "#,
    )
    .bind(room_id)
    .bind(author_id)
    .bind(title)
    .bind(body)
    .bind(alert_type)
    .bind(ticker_symbol)
    .bind(entry_price)
    .bind(stop_loss)
    .bind(take_profit)
    .bind(legal_disclosure)
    .fetch_one(pool)
    .await
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE alerts SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
