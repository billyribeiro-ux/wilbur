# =============================================================================
# Wilbur Trading Room - SvelteKit (pnpm workspace: repo root + svelte-app)
# Build from monorepo root: docker build -f svelte-app/Dockerfile ..
# =============================================================================

FROM node:24.14.1-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY svelte-app/package.json ./svelte-app/
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Production build
# -----------------------------------------------------------------------------
FROM base AS builder
COPY svelte-app ./svelte-app
RUN pnpm --filter wilbur-trading-room run build

# -----------------------------------------------------------------------------
# Runner (production)
# -----------------------------------------------------------------------------
FROM node:24.14.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit
COPY --from=builder /app/svelte-app/build ./build
COPY --from=builder /app/svelte-app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN chown -R sveltekit:nodejs /app
USER sveltekit
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["node", "build"]

# -----------------------------------------------------------------------------
# Development (default image target — matches local docker-compose)
# -----------------------------------------------------------------------------
FROM base AS development
COPY svelte-app ./svelte-app
WORKDIR /app/svelte-app
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host"]
