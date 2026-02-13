# ── Stage 1: Chef ─────────────────────────────────────────────────────────────
FROM rust:1.82-slim AS chef

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef

WORKDIR /app

# ── Stage 2: Planner ─────────────────────────────────────────────────────────
FROM chef AS planner

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo chef prepare --recipe-path recipe.json

# ── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM chef AS builder

COPY --from=planner /app/recipe.json recipe.json

# Build dependencies (cached as long as recipe.json is unchanged)
RUN cargo chef cook --release --recipe-path recipe.json

# Copy the full source and build the application
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY .sqlx ./.sqlx

ENV SQLX_OFFLINE=true

RUN cargo build --release --bin wilbur-api

# ── Stage 4: Runtime ─────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid appuser --shell /bin/false --create-home appuser

COPY --from=builder /app/target/release/wilbur-api /usr/local/bin/wilbur-api

RUN chown appuser:appuser /usr/local/bin/wilbur-api

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["wilbur-api"]
