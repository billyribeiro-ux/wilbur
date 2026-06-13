// src/services/oauthApi.ts
// OAuth API service using integrationsApi
import { api } from '../api/client';
import { integrationsApi } from '../api/integrations';

export interface OAuthConnection {
  id: string;
  user_id: string;
  provider: 'spotify' | 'x' | 'linkedin';
  provider_user_id: string;
  display_name: string;
  profile_image?: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at: string;
}

/**
 * Get OAuth configuration for a provider
 */
export async function getOAuthConfig(provider: 'spotify' | 'x' | 'linkedin') {
  console.log(`[getOAuthConfig] Starting config fetch for ${provider}...`);

  if (!api.isAuthenticated()) {
    console.error('[getOAuthConfig] No session found');
    throw new Error('Not authenticated');
  }

  try {
    const data = await integrationsApi.getConfig(provider);

    console.log('[getOAuthConfig] Successfully received config');

    const config = {
      clientId: data.client_id,
      redirectUri: `${window.location.origin}/oauth/callback`,
    };

    console.log('[getOAuthConfig] Final config:', config);
    return config;

  } catch (error) {
    console.error('[getOAuthConfig] Fatal error during fetch:', error);
    throw error;
  }
}

/**
 * Exchange OAuth code for tokens and save connection
 */
export async function connectOAuthProvider(
  provider: 'spotify' | 'x' | 'linkedin',
  code: string,
  _userId: string
): Promise<OAuthConnection> {
  console.log('[connectOAuthProvider] Starting...', { provider, code: code.substring(0, 10) + '...' });

  if (!api.isAuthenticated()) {
    console.error('[connectOAuthProvider] No valid session found!');
    throw new Error('Not authenticated');
  }

  console.log('[connectOAuthProvider] Session valid');

  const redirectUri = `${window.location.origin}/oauth/callback`;

  console.log('[connectOAuthProvider] Exchanging code for tokens...');

  // Exchange code and let the server handle profile fetching, token storage, etc.
  const result = await integrationsApi.exchange(provider, code, redirectUri);

  console.log('[connectOAuthProvider] Exchange complete');

  // Build the OAuthConnection from the server response
  return {
    id: '', // Server manages the record ID
    user_id: _userId,
    provider,
    provider_user_id: result.profile?.id || 'unknown',
    display_name: result.profile?.display_name || 'Connected User',
    profile_image: undefined,
    access_token: result.access_token,
    refresh_token: result.refresh_token || undefined,
    expires_at: result.expires_in
      ? new Date(Date.now() + result.expires_in * 1000).toISOString()
      : undefined,
    connected_at: new Date().toISOString(),
  };
}

/**
 * Disconnect OAuth provider
 */
export async function disconnectOAuthProvider(
  provider: 'spotify' | 'x' | 'linkedin',
  _userId: string
): Promise<void> {
  if (!api.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  await integrationsApi.disconnect(provider);
}

/**
 * Get user's OAuth connections
 * Note: This now delegates to the integrations API. The server returns active connections.
 */
export async function getUserOAuthConnections(_userId: string): Promise<OAuthConnection[]> {
  if (!api.isAuthenticated()) {
    return [];
  }

  try {
    // Fetch config for each provider to check connectivity.
    // The server manages connections; we return what we can determine.
    const providers: Array<'spotify' | 'x' | 'linkedin'> = ['spotify', 'x', 'linkedin'];
    const connections: OAuthConnection[] = [];

    for (const provider of providers) {
      try {
        await integrationsApi.getConfig(provider);
        // If getConfig succeeds, the provider is available but we need active connection data.
        // Since the new API doesn't expose a list endpoint on connections directly,
        // consumers should migrate to integrationsApi directly.
      } catch {
        // Provider not configured, skip
      }
    }

    return connections;
  } catch (error) {
    console.error('Failed to get OAuth connections:', error);
    return [];
  }
}

/**
 * Refresh token if needed
 * The new API handles token refresh server-side. This function now delegates
 * to integrationsApi.refresh() which refreshes and returns the new access token.
 */
export async function refreshTokenIfNeeded(
  _integration: Record<string, unknown>,
  provider: 'spotify' | 'x' | 'linkedin'
): Promise<string> {
  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = _integration.token_expires_at ? new Date(_integration.token_expires_at as string) : undefined;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return _integration.access_token as string;
  }

  if (!api.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  // Delegate to the server-side refresh endpoint
  const result = await integrationsApi.refresh(provider);
  return result.access_token;
}

/**
 * Post to Twitter/X
 * Uses the integrations API - the server handles fetching the active integration
 * and posting with the appropriate access token.
 */
export async function postToTwitter(_userId: string, content: string): Promise<Record<string, unknown>> {
  if (!api.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  return api.post<Record<string, unknown>>('/api/v1/integrations/x/post', { content });
}

/**
 * Post to LinkedIn
 * Uses the integrations API - the server handles fetching the active integration
 * and posting with the appropriate access token.
 */
export async function postToLinkedIn(_userId: string, content: string): Promise<Record<string, unknown>> {
  if (!api.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  return api.post<Record<string, unknown>>('/api/v1/integrations/linkedin/post', { content });
}
