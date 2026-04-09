# Wilbur - Trading Room Platform

A real-time trading room platform built with React, TypeScript, and Rust (Axum).

## Features

### Core Functionality
- **Real-time Video/Audio** - Browser capture; relay/SFU will plug into `src/services/roomTransport.ts` when the backend provides it
- **Trading Rooms** - Create and join trading rooms with role-based permissions
- **Live Chat** - Real-time messaging with emoji support
- **Alerts System** - Post and view trading alerts with media support
- **Polls** - Create and vote on polls within rooms
- **Screen Sharing** - Share your screen with room participants
- **Recording** - Record room sessions (host/moderator only)

### User Features
- **Single Session Enforcement** - Auto-logout when logging in from another device
- **Member Location Tracking** - See where members are joining from (city/state)
- **Custom Themes** - Fully customizable room themes and branding
- **Profile Management** - Avatar, display name, and bio
- **Responsive Design** - Works on desktop, tablet, and mobile

### Integrations
- **Spotify** - Connect and control Spotify playback (Web Player + API)
- **LinkedIn** - Connect your LinkedIn profile
- **X (Twitter)** - Connect your X/Twitter account

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Backend**: Rust (Axum), SQLx, PostgreSQL
- **Real-time**: Native WebSocket to the Rust API
- **Authentication**: JWT (Rust backend)
- **Storage**: Rust backend file API
- **Rate Limiting**: Governor (GCRA)

## Installation

Use **Node.js 24.14.1** (current LTS line). The repo includes [`.nvmrc`](./.nvmrc) for `nvm use` / `fnm use`.

```bash
# Install frontend dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run frontend dev server (React on http://localhost:5174)
pnpm run dev

# Run Rust backend
cd wilbur-api && cargo run
```

### React + SvelteKit at the same time

This repo includes a **separate** SvelteKit app under `svelte-app/`. It does **not** share source code with the React app: different entrypoints, configs, ESLint, and TypeScript project. Ports are fixed so both dev servers can run together:

| App | Port | Command (from repo root) |
|-----|------|---------------------------|
| React (Vite) | **5174** | `pnpm run dev` or `pnpm run dev:react` |
| SvelteKit | **5173** | `pnpm run dev:svelte` |

**Boundaries**

- Do not import `svelte-app/` from `src/` (enforced by ESLint and `pnpm run check:isolation`).
- **PE7 gates**: `pnpm run check:pe7` scans `src/` for forbidden imports (e.g. Supabase client, `livekit-client`, `svelte-app`). Pair with `pnpm run check:isolation` in CI.
- Lint React from the repo root: `pnpm run lint`. Lint SvelteKit from its app: `pnpm --dir svelte-app run lint`.
- Build React: `pnpm run build`. Build SvelteKit: `pnpm --dir svelte-app run build`.

## Environment Variables

Required in `.env` (see [`.env.example`](./.env.example)):
```
VITE_API_BASE_URL=http://localhost:3001
```

## Database

Run migrations via SQLx:
```bash
cd wilbur-api && sqlx migrate run
```

## Deployment

```bash
# Build frontend for production
pnpm run build

# Build Rust backend for production
cd wilbur-api && cargo build --release
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
