/**
 * Integrations API — Replaces Supabase Edge Function calls for OAuth.
 */

import { api } from './client';

interface OAuthConfig {
  client_id: string;
  auth_url: string;
  scopes: string[];
}

interface ExchangeResponse {
  access_token: string;
  refresh_token: string | undefined;
  expires_in: number;
  profile: {
    id: string;
    display_name: string | undefined;
    email: string | undefined;
  };
}

type Provider = 'spotify' | 'x' | 'linkedin';

export const integrationsApi = {
  getConfig(provider: Provider): Promise<OAuthConfig> {
    return api.get<OAuthConfig>(`/api/v1/integrations/${provider}/config`);
  },

  exchange(provider: Provider, code: string, redirectUri: string): Promise<ExchangeResponse> {
    return api.post<ExchangeResponse>(`/api/v1/integrations/${provider}/exchange`, {
      code,
      redirect_uri: redirectUri,
    });
  },

  refresh(provider: Provider): Promise<{ access_token: string; expires_in: number }> {
    return api.post(`/api/v1/integrations/${provider}/refresh`);
  },

  disconnect(provider: Provider): Promise<void> {
    return api.delete(`/api/v1/integrations/${provider}/disconnect`);
  },
};
