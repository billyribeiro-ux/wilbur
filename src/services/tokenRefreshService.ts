// Token refresh service using integrationsApi
// The API client handles JWT auto-refresh on 401 automatically.
// This service now handles OAuth provider token refresh (Spotify, X, LinkedIn).
import { integrationsApi } from '../api/integrations';
import { refreshTokenIfNeeded } from './oauthApi';

interface TokenRefreshConfig {
  userId: string;
  provider: 'spotify' | 'x' | 'linkedin';
  onRefresh?: (newToken: string) => void;
  onError?: (error: Error) => void;
}

class TokenRefreshService {
  private intervals: Map<string, number> = new Map();

  startAutoRefresh(config: TokenRefreshConfig): void {
    const key = `${config.provider}-${config.userId}`;

    if (this.intervals.has(key)) {
      console.log(`Auto-refresh already active for ${key}`);
      return;
    }

    const checkAndRefresh = async () => {
      try {
        // Use the server-side refresh endpoint.
        // The server knows whether a refresh is needed based on token expiry.
        const result = await integrationsApi.refresh(config.provider);

        if (result.access_token && config.onRefresh) {
          config.onRefresh(result.access_token);
        }

        console.log(`Token refreshed for ${key}`);
      } catch (error) {
        // If refresh fails with a "not connected" type error, stop auto-refresh
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not connected') || errorMessage.includes('Not found')) {
          console.log(`No active integration found for ${key}, stopping auto-refresh`);
          this.stopAutoRefresh(config.provider, config.userId);
          return;
        }

        console.error(`Failed to refresh token for ${key}:`, error);
        if (config.onError) {
          config.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    checkAndRefresh();

    const intervalId = window.setInterval(checkAndRefresh, 5 * 60 * 1000);
    this.intervals.set(key, intervalId);
    console.log(`Started auto-refresh for ${key}`);
  }

  stopAutoRefresh(provider: string, userId: string): void {
    const key = `${provider}-${userId}`;
    const intervalId = this.intervals.get(key);

    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
      console.log(`Stopped auto-refresh for ${key}`);
    }
  }

  stopAll(): void {
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals.clear();
    console.log('Stopped all auto-refresh intervals');
  }
}

export const tokenRefreshService = new TokenRefreshService();
