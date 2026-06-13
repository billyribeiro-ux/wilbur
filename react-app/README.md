# Wilbur — React App

A real-time trading room platform built with React, TypeScript, and Vite. This is
one of two **fully independent** front-end apps in the repository (the other is the
SvelteKit app in [`../svelte-app/`](../svelte-app)). The two apps share no source,
no dependencies, and no lockfile — see the repo [root README](../README.md).

## Features

### Core Functionality
- **Real-time Video/Audio** - Browser capture; relay/SFU will plug into `src/services/roomTransport.ts` when the backend provides it
- **Trading Rooms** - Create and join trading rooms with role-based permissions
- **Live Chat** - Real-time messaging with emoji support
- **Alerts System** - Post and view trading alerts with media support
- **Polls** - Create and vote on polls within rooms
- **Screen Sharing** - Share your screen with room participants
- **Recording** - Record room sessions (host/moderator only)

### Integrations
- **Spotify** - Connect and control Spotify playback (Web Player + API)
- **LinkedIn** - Connect your LinkedIn profile
- **X (Twitter)** - Connect your X/Twitter account

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Backend**: Rust (Axum), SQLx, PostgreSQL — see [`../wilbur-api/`](../wilbur-api)
- **Real-time**: Native WebSocket to the Rust API
- **Authentication**: JWT (Rust backend)

## Installation

Use **Node.js 24.14.1** (see [`.nvmrc`](./.nvmrc) for `nvm use` / `fnm use`).
All commands run **from this folder** (`react-app/`).

```bash
# Install dependencies (independent lockfile — pnpm-lock.yaml lives here)
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run dev server (http://localhost:5174)
pnpm run dev
```

The dev server is fixed to **port 5174** so it can run alongside the SvelteKit app
(port 5173) without conflict.

## Environment Variables

Required in `.env` (see [`.env.example`](./.env.example)):

```
VITE_API_BASE_URL=http://localhost:3000
```

## Isolation & Quality Gates

This app must never import the SvelteKit app. Boundaries are enforced locally and in CI:

- `pnpm run check:isolation` — fails if the React tree imports `svelte-app/`.
- `pnpm run check:pe7` — scans `src/` for forbidden imports (Supabase client, `livekit-client`, `svelte-app`).
- `pnpm run lint` — ESLint over `src tests scripts`.

CI runs these in `.github/workflows/react.yml`, path-filtered to `react-app/**`.

## Build

```bash
pnpm run build      # production build → dist/
pnpm run preview    # preview the production build
```
