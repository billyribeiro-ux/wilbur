use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    // Database
    pub database_url: String,
    pub database_max_connections: u32,

    // JWT
    pub jwt_secret: String,
    pub jwt_access_token_expiry_secs: i64,
    pub jwt_refresh_token_expiry_secs: i64,

    // Server
    pub port: u16,
    pub allowed_origins: Vec<String>,
    /// Public web app origin (verification and reset links in emails).
    pub frontend_base_url: String,
    /// When true, new accounts are created with `email_verified_at` set and no verification email is sent.
    /// Use only for local development.
    pub auth_skip_email_verification: bool,

    // S3/R2
    pub s3_bucket: String,
    pub s3_region: String,
    pub s3_endpoint: String,

    // LiveKit
    pub livekit_api_key: String,
    pub livekit_api_secret: String,
    pub livekit_url: String,

    // SMTP
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub smtp_from: String,

    // OAuth — Spotify
    pub spotify_client_id: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: require_env("DATABASE_URL")?,
            database_max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "20".to_string())
                .parse()
                .unwrap_or(20),

            jwt_secret: require_env("JWT_SECRET")?,
            jwt_access_token_expiry_secs: env::var("JWT_ACCESS_TOKEN_EXPIRY_SECS")
                .unwrap_or_else(|_| "3600".to_string())
                .parse()
                .unwrap_or(3600),
            jwt_refresh_token_expiry_secs: env::var("JWT_REFRESH_TOKEN_EXPIRY_SECS")
                .unwrap_or_else(|_| "2592000".to_string())
                .parse()
                .unwrap_or(2592000),

            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),
            allowed_origins: env::var("ALLOWED_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:5173,http://localhost:5174".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),

            frontend_base_url: env::var("FRONTEND_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string())
                .trim_end_matches('/')
                .to_string(),

            auth_skip_email_verification: env::var("AUTH_SKIP_EMAIL_VERIFICATION")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),

            s3_bucket: env::var("S3_BUCKET").unwrap_or_else(|_| "wilbur-storage".to_string()),
            s3_region: env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string()),
            s3_endpoint: env::var("S3_ENDPOINT").unwrap_or_else(|_| String::new()),

            livekit_api_key: env::var("LIVEKIT_API_KEY").unwrap_or_default(),
            livekit_api_secret: env::var("LIVEKIT_API_SECRET").unwrap_or_default(),
            livekit_url: env::var("LIVEKIT_URL").unwrap_or_default(),

            smtp_host: env::var("SMTP_HOST").unwrap_or_default(),
            smtp_port: env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_username: env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: env::var("SMTP_PASSWORD").unwrap_or_default(),
            smtp_from: env::var("SMTP_FROM").unwrap_or_default(),

            spotify_client_id: env::var("SPOTIFY_CLIENT_ID").unwrap_or_default(),
        })
    }
}

fn require_env(key: &str) -> Result<String, String> {
    env::var(key).map_err(|_| format!("Missing required environment variable: {key}"))
}
