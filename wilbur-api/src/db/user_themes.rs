use sqlx::PgPool;
use uuid::Uuid;

use crate::models::theme::UserTheme;

pub async fn list_by_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<UserTheme>, sqlx::Error> {
    sqlx::query_as::<_, UserTheme>(
        "SELECT * FROM user_themes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<UserTheme>, sqlx::Error> {
    sqlx::query_as::<_, UserTheme>("SELECT * FROM user_themes WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn create(
    pool: &PgPool,
    user_id: Uuid,
    name: &str,
    theme_data: serde_json::Value,
) -> Result<UserTheme, sqlx::Error> {
    sqlx::query_as::<_, UserTheme>(
        r#"
        INSERT INTO user_themes (id, user_id, name, theme_data)
        VALUES (gen_random_uuid(), $1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(name)
    .bind(theme_data)
    .fetch_one(pool)
    .await
}

pub async fn update(
    pool: &PgPool,
    id: Uuid,
    name: Option<&str>,
    theme_data: Option<serde_json::Value>,
    is_active: Option<bool>,
) -> Result<UserTheme, sqlx::Error> {
    sqlx::query_as::<_, UserTheme>(
        r#"
        UPDATE user_themes
        SET name = COALESCE($2, name),
            theme_data = COALESCE($3, theme_data),
            is_active = COALESCE($4, is_active)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(theme_data)
    .bind(is_active)
    .fetch_one(pool)
    .await
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM user_themes WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
