# Wilbur - Trading Room Platform

A real-time trading room platform built with React, TypeScript, Rust (Axum), and LiveKit.

## Features

### Core Functionality
- **Real-time Video/Audio** - LiveKit integration for high-quality streaming
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

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Backend**: Rust (Axum), SQLx, PostgreSQL
- **Real-time**: Native WebSocket, LiveKit
- **Authentication**: JWT (Rust backend)
- **Storage**: Rust backend file API
- **Rate Limiting**: Governor (GCRA)

## Installation

```bash
# Install frontend dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run frontend dev server
npm run dev

# Run Rust backend
cd wilbur-api && cargo run
```

## Environment Variables

Required in `.env`:
```
VITE_API_BASE_URL=http://localhost:3001
VITE_LIVEKIT_URL=your_livekit_url
VITE_LIVEKIT_API_KEY=your_livekit_api_key
VITE_LIVEKIT_API_SECRET=your_livekit_api_secret
```

## Database

Run migrations via SQLx:
```bash
cd wilbur-api && sqlx migrate run
```

## Deployment

```bash
# Build frontend for production
npm run build

# Build Rust backend for production
cd wilbur-api && cargo build --release
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
