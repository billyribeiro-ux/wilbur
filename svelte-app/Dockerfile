# =============================================================================
# Wilbur Trading Room - Dockerfile
# December 2025 | Svelte 5 + SvelteKit
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner (Production)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R sveltekit:nodejs /app

USER sveltekit

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "build"]

# -----------------------------------------------------------------------------
# Stage: Development
# -----------------------------------------------------------------------------
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
