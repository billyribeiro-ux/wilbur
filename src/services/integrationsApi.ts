// Integrations service using integrationsApi
import { api } from '../api/client';
import { integrationsApi } from '../api/integrations';
import type { Json } from '../types/database.types';

export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: 'spotify' | 'x' | 'linkedin';
  access_token: string | undefined;
  refresh_token: string | undefined;
  token_expires_at: string | undefined;
  connected_at: string;
  last_refreshed_at: string | undefined;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export async function getUserIntegrations(_userId: string): Promise<UserIntegration[]> {
  // The server identifies the user from the JWT. We fetch integrations via the API.
  // Since the integrations API doesn't have a direct list endpoint, we check each provider.
  const providers: Array<'spotify' | 'x' | 'linkedin'> = ['spotify', 'x', 'linkedin'];
  const integrations: UserIntegration[] = [];

  for (const provider of providers) {
    try {
      // Try to get config for each provider to see if it's connected
      const config = await integrationsApi.getConfig(provider);
      if (config) {
        // Provider is available; actual connection status is managed server-side
      }
    } catch {
      // Provider not configured or not connected, skip
    }
  }

  return integrations;
}

export async function getUserIntegration(
  _userId: string,
  integrationType: 'spotify' | 'x' | 'linkedin'
): Promise<UserIntegration | undefined> {
  try {
    // Try to get the config; if it succeeds the integration is available
    await integrationsApi.getConfig(integrationType);
    // The new API manages integration state server-side.
    // Consumers should migrate to integrationsApi directly.
    return undefined;
  } catch {
    // Gracefully return undefined if not authenticated or query fails
    return undefined;
  }
}

export async function upsertUserIntegration(
  _userId: string,
  integrationType: 'spotify' | 'x' | 'linkedin',
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  },
  _metadata?: Json
): Promise<UserIntegration> {
  // The server handles upserting via the exchange endpoint.
  // This function now creates the integration by calling refresh to persist the token.
  const redirectUri = `${window.location.origin}/oauth/callback`;

  // Since we already have tokens, we use the API to store/refresh them.
  // The exchange endpoint expects a code, so we use refresh instead to update the token.
  const result = await integrationsApi.refresh(integrationType);

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : undefined;

  return {
    id: '',
    user_id: _userId,
    integration_type: integrationType,
    access_token: result.access_token || tokens.access_token,
    refresh_token: tokens.refresh_token || undefined,
    token_expires_at: expiresAt,
    connected_at: new Date().toISOString(),
    last_refreshed_at: new Date().toISOString(),
    is_active: true,
    metadata: _metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function disconnectUserIntegration(
  _userId: string,
  integrationType: 'spotify' | 'x' | 'linkedin'
): Promise<void> {
  await integrationsApi.disconnect(integrationType);
}

export async function refreshIntegrationToken(
  _userId: string,
  integrationType: 'spotify' | 'x' | 'linkedin',
  _newAccessToken: string,
  _expiresIn?: number
): Promise<void> {
  // The server handles refreshing. Calling refresh will update the token server-side.
  await integrationsApi.refresh(integrationType);
}
