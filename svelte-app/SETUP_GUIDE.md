# Wilbur Trading Room - Setup Guide
## December 2025 | Svelte 5 + Pocketbase + Turso

---

## Quick Start

```bash
# Navigate to the project
cd wilbur-svelte

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Download Pocketbase (one-time)
npm run pocketbase:download

# Start Pocketbase (in separate terminal)
npm run pocketbase:start

# Start the development server
npm run dev
```

---

## Architecture Overview

```
Wilbur Trading Room
├── Frontend: SvelteKit + Svelte 5 Runes
├── Backend: Pocketbase (Auth, Database, Realtime, Storage)
├── Analytics DB: Turso (Edge SQLite for global low-latency)
├── UI: Skeleton UI v3 + TailwindCSS v4
├── Video/Audio: LiveKit (Coming soon - placeholder ready)
└── Music: Spotify Integration
```

---

## Service Setup & Subscription Tiers

### 1. Pocketbase (Self-Hosted Backend)

**Cost: FREE (Self-hosted)**

Pocketbase is a single binary that provides:
- Authentication (Email, OAuth)
- Database (SQLite)
- Real-time subscriptions
- File storage
- Admin UI

#### Setup:
```bash
# Download Pocketbase
npm run pocketbase:download

# Or download manually from:
# https://github.com/pocketbase/pocketbase/releases

# Start the server
./pocketbase serve --http=127.0.0.1:8090

# Import schema
# 1. Open http://127.0.0.1:8090/_/
# 2. Create admin account
# 3. Go to Settings > Import Collections
# 4. Import pocketbase/pb_schema.json
```

#### Production Deployment Options:
| Platform | Cost | Notes |
|----------|------|-------|
| **Railway** | $5/mo | Easiest deployment |
| **Fly.io** | $0-5/mo | Free tier available |
| **DigitalOcean** | $4/mo | Droplet hosting |
| **Self-hosted VPS** | $3-10/mo | Full control |

**Signup Links:**
- Railway: https://railway.app
- Fly.io: https://fly.io
- DigitalOcean: https://www.digitalocean.com

---

### 2. Turso (Edge Database)

**Sign Up:** https://turso.tech

#### Pricing Tiers (December 2025):

| Tier | Price | Databases | Storage | Row Reads |
|------|-------|-----------|---------|-----------|
| **Starter** | FREE | 500 | 9GB | 1B/month |
| **Scaler** | $29/mo | Unlimited | 24GB | 100B/month |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited |

#### Setup:
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create wilbur-trading

# Get connection URL
turso db show wilbur-trading --url

# Create auth token
turso db tokens create wilbur-trading

# Add to .env:
# TURSO_DATABASE_URL=libsql://wilbur-trading-yourorg.turso.io
# TURSO_AUTH_TOKEN=your-token-here
```

**Why Turso?**
- Sub-10ms reads globally (edge replicas)
- SQLite compatibility
- Perfect for analytics and read-heavy queries
- Embedded replicas for offline support

---

### 3. Spotify Integration

**Sign Up:** https://developer.spotify.com/dashboard

**Cost: FREE** (API access)

#### Setup:
1. Go to https://developer.spotify.com/dashboard
2. Click "Create App"
3. Set Redirect URI: `http://localhost:5173/api/spotify/callback`
4. Copy Client ID and Client Secret to `.env`

#### Required Scopes:
- `user-read-playback-state`
- `user-modify-playback-state`
- `user-read-currently-playing`
- `streaming`
- `user-library-read`

---

### 4. LiveKit (Video/Audio) - Coming Soon

**Sign Up:** https://livekit.io

#### Pricing Tiers (December 2025):

| Tier | Price | Participant Minutes |
|------|-------|---------------------|
| **Free** | $0 | 1,000/month |
| **Pro** | $50/mo | 10,000/month |
| **Scale** | Custom | Unlimited |

#### Self-Hosted Option:
You can also self-host LiveKit on your own infrastructure:
- Docker: https://docs.livekit.io/oss/deployment/
- Kubernetes: https://docs.livekit.io/oss/deployment/kubernetes/

**Note:** LiveKit integration is prepared with placeholder code. When you set up your own LiveKit server later this week, simply:
1. Get your LiveKit credentials
2. Add them to `.env`
3. The token generation API is already in place at `/api/livekit/token`

---

## Complete Cost Summary

### Development (Local)
| Service | Cost |
|---------|------|
| Pocketbase | FREE |
| Turso | FREE (Starter) |
| Spotify API | FREE |
| LiveKit | FREE (1K mins) |
| **Total** | **$0/month** |

### Production (Small Scale - 1K users)
| Service | Cost |
|---------|------|
| Pocketbase (Railway) | $5/mo |
| Turso (Starter) | FREE |
| Spotify API | FREE |
| LiveKit (Free) | FREE |
| Vercel (Hosting) | FREE |
| **Total** | **$5/month** |

### Production (Medium Scale - 10K users)
| Service | Cost |
|---------|------|
| Pocketbase (Dedicated) | $20/mo |
| Turso (Scaler) | $29/mo |
| Spotify API | FREE |
| LiveKit (Pro) | $50/mo |
| Vercel (Pro) | $20/mo |
| **Total** | **~$119/month** |

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Other Platforms

The project includes adapters for:
- **Vercel**: `@sveltejs/adapter-vercel`
- **Node**: `@sveltejs/adapter-node`
- **Auto**: `@sveltejs/adapter-auto` (auto-detects platform)

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_POCKETBASE_URL` | Yes | Pocketbase instance URL |
| `TURSO_DATABASE_URL` | For analytics | Turso database URL |
| `TURSO_AUTH_TOKEN` | For analytics | Turso auth token |
| `VITE_SPOTIFY_CLIENT_ID` | For Spotify | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | For Spotify | Spotify app secret |
| `LIVEKIT_URL` | For video | LiveKit server URL |
| `LIVEKIT_API_KEY` | For video | LiveKit API key |
| `LIVEKIT_API_SECRET` | For video | LiveKit API secret |

---

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Type checking
npm run check
```

---

## Project Structure

```
wilbur-svelte/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── services/       # API services (Pocketbase, Turso)
│   │   ├── stores/         # Svelte 5 Runes state management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── routes/             # SvelteKit routes
│   │   ├── api/            # API endpoints
│   │   ├── auth/           # Auth pages
│   │   └── rooms/          # Room pages
│   ├── app.css             # Global styles
│   ├── app.html            # HTML template
│   └── hooks.server.ts     # Server hooks
├── pocketbase/
│   └── pb_schema.json      # Pocketbase schema
├── tests/                  # Playwright E2E tests
├── .env.example            # Environment template
└── package.json
```

---

## Key Features Implemented

- [x] Authentication (Email + OAuth ready)
- [x] Real-time chat with Pocketbase subscriptions
- [x] Trading alerts with legal disclosures
- [x] Room management and memberships
- [x] Role-based access (Admin, Host, Moderator, Member)
- [x] Moderation tools (Kick, Ban, Mute placeholders)
- [x] Spotify integration
- [x] Dark theme with Skeleton UI
- [x] Responsive design
- [x] E2E tests with Playwright
- [ ] LiveKit video/audio (Placeholder ready)

---

## Support

For questions about:
- **Pocketbase**: https://pocketbase.io/docs/
- **Turso**: https://docs.turso.tech/
- **SvelteKit**: https://kit.svelte.dev/docs
- **Svelte 5**: https://svelte.dev/docs/svelte/overview
- **LiveKit**: https://docs.livekit.io/

---

*Built with Svelte 5, Pocketbase, and Turso - December 2025*
