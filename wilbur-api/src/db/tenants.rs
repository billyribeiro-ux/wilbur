use sqlx::PgPool;
use uuid::Uuid;

use crate::models::tenant::Tenant;

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Tenant>, sqlx::Error> {
    sqlx::query_as::<_, Tenant>("SELECT * FROM tenants WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn update(
    pool: &PgPool,
    id: Uuid,
    business_name: Option<&str>,
    logo_url: Option<&str>,
    primary_color: Option<&str>,
    secondary_color: Option<&str>,
) -> Result<Tenant, sqlx::Error> {
    sqlx::query_as::<_, Tenant>(
        r#"
        UPDATE tenants
        SET business_name = COALESCE($2, business_name),
            logo_url = COALESCE($3, logo_url),
            primary_color = COALESCE($4, primary_color),
            secondary_color = COALESCE($5, secondary_color)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(business_name)
    .bind(logo_url)
    .bind(primary_color)
    .bind(secondary_color)
    .fetch_one(pool)
    .await
}
