# LiveKit Setup Guide - Production-Grade Real-Time Video/Audio

## 🎥 Overview

LiveKit powers the real-time video, audio, and screen sharing features in your trading room application. This guide will get you from zero to production in minutes.

## 🚀 Quick Start (5 Minutes)

### Step 1: Create LiveKit Account

1. **Sign up for LiveKit Cloud**:
   - Visit: https://cloud.livekit.io/
   - Click "Sign Up" (free tier available)
   - Verify your email

2. **Create a Project**:
   - Click "Create Project"
   - Name: `Wilbur Trading Room`
   - Region: Choose closest to your users (e.g., `us-west-2`)

### Step 2: Get Your Credentials

1. **Navigate to Settings**:
   - In your project dashboard, click "Settings"
   - Go to "Keys" tab

2. **Generate API Key**:
   - Click "Create API Key"
   - Name: `Wilbur Production`
   - Copy the credentials (you'll only see them once!)

You'll receive:
```
API Key:    APIxxxxxxxxxxxxxxxxx
API Secret: SECRETxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WebSocket URL: wss://your-project-xxxxx.livekit.cloud
```

### Step 3: Configure Your Application

#### **React Frontend** (`/Users/billyribeiro/Desktop/trading-room-app/wilbur/.env`)

```bash
# LiveKit Configuration
VITE_LIVEKIT_URL=wss://your-project-xxxxx.livekit.cloud

# Debug mode (optional - shows connection logs)
VITE_DEBUG_LIVEKIT=true
```

#### **Rust Backend** (`/Users/billyribeiro/Desktop/trading-room-app/wilbur/wilbur-api/.env`)

```bash
# LiveKit Server Configuration
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=SECRETxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project-xxxxx.livekit.cloud
```

### Step 4: Restart Services

```bash
# Terminal 1: Restart Rust API
cd wilbur-api
cargo run

# Terminal 2: Restart React App (if needed)
cd ..
pnpm dev
```

### Step 5: Test Connection

1. Open your app: http://localhost:5173
2. Join a trading room
3. Click the camera/microphone icons
4. Grant browser permissions when prompted
5. You should see your video feed! 🎉

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React App     │         │   Rust API       │         │  LiveKit Cloud  │
│  (Frontend)     │◄───────►│   (Backend)      │◄───────►│   (SFU Server)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     │                              │                              │
     │ 1. Request token             │ 2. Generate JWT              │
     │ ─────────────────────────────►│ ────────────────────────────►│
     │                              │                              │
     │ 3. Return token              │                              │
     │◄─────────────────────────────│                              │
     │                              │                              │
     │ 4. Connect with token        │                              │
     │ ─────────────────────────────────────────────────────────────►│
     │                              │                              │
     │ 5. WebRTC media streams      │                              │
     │◄─────────────────────────────────────────────────────────────│
```

## 🔐 Security Best Practices

### Token Generation Flow

**NEVER** expose your API Secret to the frontend! The Rust backend generates secure tokens:

1. **Frontend** requests a LiveKit token from your Rust API
2. **Rust API** validates the user's session
3. **Rust API** generates a JWT token using LiveKit SDK
4. **Frontend** uses the token to connect to LiveKit

Your Rust API already implements this securely in:
- `wilbur-api/src/routes/livekit.rs` - Token generation endpoint
- `wilbur-api/src/services/livekit.rs` - LiveKit service layer

### Token Permissions

Tokens can have granular permissions:
```rust
// Example from your Rust API
VideoGrant {
    room_join: true,
    room: room_name,
    can_publish: true,
    can_subscribe: true,
    can_publish_data: true,
    // ... more permissions
}
```

## 🧪 Testing Your Setup

### 1. Test Token Generation

```bash
# Test the LiveKit token endpoint
curl -X POST http://localhost:3001/api/v1/livekit/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "test-room",
    "participant_name": "Test User"
  }'

# Expected response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Test Video Connection

1. Open two browser windows side-by-side
2. Join the same room in both
3. Enable camera/microphone in both
4. You should see both video feeds!

### 3. Test Screen Sharing

1. Click the screen share button
2. Select a window/screen to share
3. Other participants should see your screen

### 4. Monitor Connection Quality

Open browser console (F12) and look for:
```
[LiveKit] Connected to room: trading-room-1
[LiveKit] Local participant: user-123
[LiveKit] Track published: camera
[LiveKit] Track published: microphone
```

## 📊 LiveKit Cloud Dashboard

Monitor your usage in real-time:

1. **Active Rooms**: See all active trading rooms
2. **Participants**: Track concurrent users
3. **Bandwidth**: Monitor data usage
4. **Quality Metrics**: Connection quality, packet loss, jitter

Access: https://cloud.livekit.io/projects/YOUR_PROJECT/dashboard

## 💰 Pricing & Limits

### Free Tier (Perfect for Development)
- **50 GB** bandwidth/month
- **Unlimited** rooms
- **Unlimited** participants
- **All features** included

### Production Pricing
- **$0.40/GB** after free tier
- **Volume discounts** available
- **No per-user fees**

Typical usage for trading room:
- **Video call (720p)**: ~1.5 GB/hour
- **Audio only**: ~50 MB/hour
- **Screen share**: ~500 MB/hour

## 🔧 Advanced Configuration

### Custom TURN Servers (Optional)

For better connectivity behind corporate firewalls:

```bash
# In wilbur-api/.env
LIVEKIT_TURN_SERVERS=turn:your-turn-server.com:3478
LIVEKIT_TURN_USERNAME=username
LIVEKIT_TURN_PASSWORD=password
```

### Webhooks (Optional)

Get notified of room events:

1. In LiveKit dashboard: Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/v1/livekit/webhook`
3. Select events: `room_started`, `room_finished`, `participant_joined`, etc.

Your Rust API has webhook handling ready in:
- `wilbur-api/src/routes/livekit.rs` - Webhook endpoint

### Recording (Optional)

Record trading sessions for compliance:

```bash
# In LiveKit dashboard: Settings → Recording
# Enable: "Automatic Recording"
# Storage: S3/R2 bucket (configure in your Rust API)
```

## 🐛 Troubleshooting

### "Connection Failed" Error

**Causes**:
1. Invalid API credentials
2. Wrong WebSocket URL
3. Firewall blocking WebRTC

**Solutions**:
```bash
# 1. Verify credentials in .env files
cat wilbur-api/.env | grep LIVEKIT

# 2. Test WebSocket connection
wscat -c wss://your-project-xxxxx.livekit.cloud

# 3. Check browser console for detailed errors
```

### "Camera/Microphone Access Denied"

**Causes**:
1. Browser permissions not granted
2. HTTPS required (in production)
3. Device already in use

**Solutions**:
1. Click the camera icon in browser address bar → Allow
2. Use `https://` in production (localhost is exempt)
3. Close other apps using camera/microphone

### "No Video/Audio Received"

**Causes**:
1. Network firewall blocking UDP
2. Symmetric NAT issues
3. Token permissions incorrect

**Solutions**:
1. Check if TCP fallback is working (slower but works)
2. Configure TURN servers (see Advanced Configuration)
3. Verify token has `can_publish` and `can_subscribe` permissions

### High Latency/Poor Quality

**Optimization**:
```typescript
// In your React app, adjust video quality
const videoPresets = {
  low: { width: 320, height: 240, frameRate: 15 },
  medium: { width: 640, height: 480, frameRate: 24 },
  high: { width: 1280, height: 720, frameRate: 30 },
};
```

## 📱 Mobile Support

LiveKit works on mobile browsers:
- **iOS Safari**: ✅ Full support
- **Android Chrome**: ✅ Full support
- **Mobile apps**: Use LiveKit React Native SDK

## 🔄 Migration from Development to Production

### 1. Update Environment Variables

```bash
# Production .env
VITE_LIVEKIT_URL=wss://your-production-project.livekit.cloud
LIVEKIT_API_KEY=your-production-api-key
LIVEKIT_API_SECRET=your-production-api-secret
```

### 2. Enable HTTPS

LiveKit requires HTTPS in production:
```bash
# Use a reverse proxy (nginx, Caddy) or deploy to:
# - Vercel (automatic HTTPS)
# - Netlify (automatic HTTPS)
# - Your own server with Let's Encrypt
```

### 3. Configure CORS

Update Rust API allowed origins:
```bash
# wilbur-api/.env
ALLOWED_ORIGINS=https://your-production-domain.com
```

### 4. Monitor Usage

Set up alerts in LiveKit dashboard:
- Bandwidth threshold: 80% of free tier
- Error rate threshold: > 5%
- Connection quality: < 3 stars

## 📚 Additional Resources

- **LiveKit Docs**: https://docs.livekit.io/
- **React Components**: https://docs.livekit.io/client-sdk-js/
- **Rust SDK**: https://github.com/livekit/server-sdk-rust
- **Community**: https://livekit.io/community

## 🎯 Next Steps

1. ✅ Create LiveKit account
2. ✅ Get API credentials
3. ✅ Update `.env` files
4. ✅ Restart services
5. ✅ Test video call
6. 🚀 Start building amazing features!

---

**Need Help?** 
- LiveKit Support: support@livekit.io
- Community Slack: https://livekit.io/community

**Last Updated**: 2026-03-01
