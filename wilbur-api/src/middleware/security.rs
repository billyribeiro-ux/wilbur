use axum::{extract::Request, middleware::Next, response::Response};

/// Middleware that adds security headers to all responses.
/// CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
pub async fn security_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // Strict Transport Security — enforce HTTPS for 1 year, include subdomains
    headers.insert(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
            .parse()
            .unwrap(),
    );

    // Prevent MIME-type sniffing
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());

    // Prevent clickjacking
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());

    // Control referrer information
    headers.insert("Referrer-Policy", "strict-origin-when-cross-origin".parse().unwrap());

    // Content Security Policy — restrict resource loading
    // API server primarily serves JSON, but CSP protects any HTML error pages
    headers.insert(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'"
            .parse()
            .unwrap(),
    );

    // Disable unnecessary browser features
    headers.insert(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()"
            .parse()
            .unwrap(),
    );

    // Prevent caching of authenticated responses
    headers.insert(
        "Cache-Control",
        "no-store, no-cache, must-revalidate".parse().unwrap(),
    );

    response
}
