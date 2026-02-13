use std::net::SocketAddr;
use std::sync::Arc;

use axum::{middleware as axum_middleware, Router};
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod extractors;
mod middleware;
mod models;
mod routes;
mod services;
mod state;
mod ws;

use config::AppConfig;
use state::AppState;

#[tokio::main]
async fn main() {
    // Load .env in development
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "wilbur_api=debug,tower_http=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = AppConfig::from_env().expect("Failed to load configuration");

    // Connect to database
    let pool = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Database migrations applied successfully");

    // Initialize S3 client
    let s3_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .endpoint_url(&config.s3_endpoint)
        .region(aws_config::Region::new(config.s3_region.clone()))
        .load()
        .await;
    let s3_client = aws_sdk_s3::Client::new(&s3_config);

    // Build application state
    let state = Arc::new(AppState::new(pool, config.clone(), s3_client));

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_origin(
            config
                .allowed_origins
                .iter()
                .filter_map(|o| o.parse().ok())
                .collect::<Vec<_>>(),
        )
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(true);

    // Build rate limiters
    let auth_limiter = middleware::rate_limit::create_auth_rate_limiter();
    let api_limiter = middleware::rate_limit::create_api_rate_limiter();

    // Auth routes with stricter rate limiting
    let auth_routes = Router::new()
        .nest("/api/v1/auth", routes::auth::router())
        .route_layer(axum_middleware::from_fn_with_state(
            auth_limiter,
            middleware::rate_limit::auth_rate_limit,
        ));

    // All other API routes with general rate limiting
    let api_routes = Router::new()
        .merge(routes::health::router())
        .nest("/ws", routes::ws::router())
        .nest("/api/v1/users", routes::users::router())
        .nest("/api/v1/rooms", routes::rooms::router())
        .nest("/api/v1/rooms/:room_id/messages", routes::messages::router())
        .nest("/api/v1/rooms/:room_id/alerts", routes::alerts::router())
        .nest("/api/v1/rooms/:room_id/polls", routes::polls::router())
        .nest("/api/v1/integrations", routes::integrations::router())
        .nest("/api/v1/storage", routes::storage::router())
        .nest("/api/v1/themes", routes::themes::router())
        .nest("/api/v1/tenants", routes::tenants::router())
        .nest("/api/v1/livekit", routes::livekit::router())
        .nest("/api/v1/moderation", routes::moderation::router())
        .nest("/api/v1/dm", routes::private_chats::router())
        .nest("/api/v1/notifications", routes::notifications::router())
        .nest("/api/v1/rooms/:room_id/tracks", routes::media_tracks::router())
        .route_layer(axum_middleware::from_fn_with_state(
            api_limiter,
            middleware::rate_limit::api_rate_limit,
        ));

    // Build router with security headers, rate limiting, CORS, and compression
    let app = Router::new()
        .merge(auth_routes)
        .merge(api_routes)
        .layer(axum_middleware::from_fn(middleware::security::security_headers))
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = TcpListener::bind(addr).await.expect("Failed to bind address");
    tracing::info!("Server listening on {}", addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, starting graceful shutdown");
}
