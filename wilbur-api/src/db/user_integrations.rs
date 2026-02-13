use sqlx::PgPool;
use uuid::Uuid;

use crate::models::integration::UserIntegration;

pub async fn find(
    pool: &PgPool,
    user_id: Uuid,
    integration_type: &str,
) -> Result<Option<UserIntegration>, sqlx::Error> {
    sqlx::query_as::<_, UserIntegration>(
        "SELECT * FROM user_integrations WHERE user_id = $1 AND integration_type = $2::integration_type",
    )
    .bind(user_id)
    .bind(integration_type)
    .fetch_optional(pool)
    .await
}

pub async fn upsert(
    pool: &PgPool,
    user_id: Uuid,
    integration_type: &str,
    access_token_encrypted: &str,
    refresh_token_encrypted: Option<&str>,
    external_user_id: Option<&str>,
    external_username: Option<&str>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<UserIntegration, sqlx::Error> {
    sqlx::query_as::<_, UserIntegration>(
        r#"
        INSERT INTO user_integrations (id, user_id, integration_type, access_token_encrypted, refresh_token_encrypted, external_user_id, external_username, expires_at)
        VALUES (gen_random_uuid(), $1, $2::integration_type, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, integration_type) DO UPDATE SET
            access_token_encrypted = $3,
            refresh_token_encrypted = COALESCE($4, user_integrations.refresh_token_encrypted),
            external_user_id = COALESCE($5, user_integrations.external_user_id),
            external_username = COALESCE($6, user_integrations.external_username),
            expires_at = $7
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(integration_type)
    .bind(access_token_encrypted)
    .bind(refresh_token_encrypted)
    .bind(external_user_id)
    .bind(external_username)
    .bind(expires_at)
    .fetch_one(pool)
    .await
}

pub async fn delete(
    pool: &PgPool,
    user_id: Uuid,
    integration_type: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM user_integrations WHERE user_id = $1 AND integration_type = $2::integration_type",
    )
    .bind(user_id)
    .bind(integration_type)
    .execute(pool)
    .await?;
    Ok(())
}
