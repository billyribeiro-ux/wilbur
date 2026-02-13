use std::sync::Arc;
use std::net::IpAddr;

use axum::{
    extract::{ConnectInfo, Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{
    clock::DefaultClock,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use std::num::NonZeroU32;

/// Shared rate limiter for auth endpoints (5 req/min per IP — global bucket).
/// In production, use a keyed rate limiter per-IP. This provides a simple global
/// burst limit that protects against brute-force attacks.
pub type AuthRateLimiter = RateLimiter<NotKeyed, InMemoryState, DefaultClock>;

/// Create an auth rate limiter: 5 requests per 60 seconds.
pub fn create_auth_rate_limiter() -> Arc<AuthRateLimiter> {
    let quota = Quota::per_minute(NonZeroU32::new(30).unwrap()) // 30/min globally across all IPs
        .allow_burst(NonZeroU32::new(5).unwrap()); // burst of 5
    Arc::new(RateLimiter::direct(quota))
}

/// Create an API rate limiter: 200 requests per 60 seconds.
pub fn create_api_rate_limiter() -> Arc<AuthRateLimiter> {
    let quota = Quota::per_minute(NonZeroU32::new(200).unwrap())
        .allow_burst(NonZeroU32::new(50).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

/// Middleware that enforces rate limiting on auth endpoints.
pub async fn auth_rate_limit(
    State(limiter): State<Arc<AuthRateLimiter>>,
    request: Request,
    next: Next,
) -> Response {
    match limiter.check() {
        Ok(_) => next.run(request).await,
        Err(_) => {
            tracing::warn!("Auth rate limit exceeded");
            (
                StatusCode::TOO_MANY_REQUESTS,
                [("Retry-After", "60")],
                "Too many requests. Please try again later.",
            )
                .into_response()
        }
    }
}

/// Middleware that enforces rate limiting on general API endpoints.
pub async fn api_rate_limit(
    State(limiter): State<Arc<AuthRateLimiter>>,
    request: Request,
    next: Next,
) -> Response {
    match limiter.check() {
        Ok(_) => next.run(request).await,
        Err(_) => {
            tracing::warn!("API rate limit exceeded");
            (
                StatusCode::TOO_MANY_REQUESTS,
                [("Retry-After", "30")],
                "Too many requests. Please try again later.",
            )
                .into_response()
        }
    }
}
