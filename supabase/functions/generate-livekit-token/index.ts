// =========================================================
// Supabase Edge Function: generate-livekit-token
// Purpose: Generate LiveKit access tokens with proper CORS
// Location: supabase/functions/generate-livekit-token/index.ts
// =========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.6.0";

// =========================================================
// CORS Headers - Restricted to configured origins
// =========================================================
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

// =========================================================
// JWT Verification
// =========================================================
function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')
  if (!token) return false
  try {
    const [, payloadB64] = token.split('.')
    const payload = JSON.parse(atob(payloadB64))
    if (!payload.sub || !payload.exp) return false
    if (payload.exp * 1000 < Date.now()) return false
    return true
  } catch {
    return false
  }
}

// =========================================================
// Environment Variables (Set in Supabase Dashboard)
// =========================================================
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');

// =========================================================
// Request Type Definition
// =========================================================
interface TokenRequest {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  participantRole?: 'host' | 'moderator' | 'member';
}

// =========================================================
// Main Handler
// =========================================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // ═══════════════════════════════════════════════════════
  // Handle CORS Preflight (OPTIONS)
  // ═══════════════════════════════════════════════════════
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }

  // ═══════════════════════════════════════════════════════
  // Validate HTTP Method
  // ═══════════════════════════════════════════════════════
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    );
  }

  // ═══════════════════════════════════════════════════════
  // Verify Caller Identity
  // ═══════════════════════════════════════════════════════
  if (!verifyAuth(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Valid JWT required.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      }
    );
  }

  try {
    // ═══════════════════════════════════════════════════════
    // Validate Environment Variables
    // ═══════════════════════════════════════════════════════
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error('[LiveKit Token] Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'LiveKit configuration missing',
          details: 'Check LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in Supabase secrets'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // ═══════════════════════════════════════════════════════
    // Parse Request Body
    // ═══════════════════════════════════════════════════════
    const body: TokenRequest = await req.json();
    const { roomName, participantIdentity, participantName, participantRole = 'member' } = body;

    // Validate required fields
    if (!roomName || !participantIdentity || !participantName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['roomName', 'participantIdentity', 'participantName']
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('[LiveKit Token] Generating token for:', {
      roomName,
      participantIdentity,
      participantName,
      participantRole
    });

    // ═══════════════════════════════════════════════════════
    // Create LiveKit Access Token
    // ═══════════════════════════════════════════════════════
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      name: participantName,
    });

    // ═══════════════════════════════════════════════════════
    // Set Permissions Based on Role
    // ═══════════════════════════════════════════════════════
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: participantRole === 'host' || participantRole === 'moderator',
    });

    // ═══════════════════════════════════════════════════════
    // Generate JWT Token
    // ═══════════════════════════════════════════════════════
    const token = await at.toJwt();

    console.log('[LiveKit Token] Token generated successfully');

    // ═══════════════════════════════════════════════════════
    // Return Success Response
    // ═══════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({ 
        token,
        url: LIVEKIT_URL,
        participantIdentity,
        roomName
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );

  } catch (error) {
    // ═══════════════════════════════════════════════════════
    // Error Handling
    // ═══════════════════════════════════════════════════════
    console.error('[LiveKit Token] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate LiveKit token',
        message: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});