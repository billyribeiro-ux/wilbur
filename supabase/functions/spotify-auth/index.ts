// Spotify OAuth Edge Function
// Handles Spotify OAuth configuration and token exchange
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Verify Supabase JWT using HMAC-SHA256 signature via Web Crypto API
async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')
  if (!jwtSecret || !token) return false

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [headerB64, payloadB64, signatureB64] = parts

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    // JWT signatures use base64url encoding
    const signatureBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`)
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes)
    if (!valid) return false

    // Verify payload claims
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub || !payload.exp) return false
    if (payload.exp * 1000 < Date.now()) return false

    return true
  } catch {
    return false
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify caller is authenticated
  if (!(await verifyAuth(req))) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Spotify credentials from environment (set via: supabase secrets set SPOTIFY_CLIENT_ID=xxx)
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!spotifyClientId || !spotifyClientSecret) {
      throw new Error('Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.')
    }

    // Action: Get OAuth config (client ID and redirect URI)
    if (action === 'config') {
      // Get origin from request header (supports production and development)
      // For local dev, you'll need to use ngrok, localtunnel, or similar
      const origin = req.headers.get('origin') || 'https://your-production-domain.com'
      
      return new Response(
        JSON.stringify({
          clientId: spotifyClientId,
          redirectUri: `${origin}/oauth/callback`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Action: Exchange authorization code for tokens
    if (action === 'exchange') {
      const { code, redirectUri } = await req.json()

      if (!code || !redirectUri) {
        throw new Error('Missing code or redirectUri')
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${error}`)
      }

      const tokens = await tokenResponse.json()

      // Get user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })

      const profile = await profileResponse.json()

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          profile: {
            id: profile.id,
            display_name: profile.display_name,
            email: profile.email,
            images: profile.images,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Action: Refresh access token
    if (action === 'refresh') {
      const { refreshToken } = await req.json()

      if (!refreshToken) {
        throw new Error('Missing refreshToken')
      }

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text()
        throw new Error(`Token refresh failed: ${error}`)
      }

      const tokens = await tokenResponse.json()

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          expires_in: tokens.expires_in,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})