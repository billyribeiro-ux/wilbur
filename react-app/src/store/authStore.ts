import { create } from 'zustand';

import { api } from '../api/client';
import { authApi } from '../api/auth';
import { wsClient } from '../api/ws';

interface AuthUser {
  id: string;
  email: string;
  display_name: string | undefined;
  avatar_url: string | undefined;
  role: string;
  tokens: number | undefined;
  created_at: string;
}

interface AuthState {
  user: AuthUser | undefined;
  isAuthenticated: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | undefined }>;
  login: (email: string, password: string) => Promise<{ error: Error | undefined }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setSession: (session: { user: AuthUser; access_token: string; refresh_token: string; expires_in: number } | undefined) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: undefined,
  isAuthenticated: false,
  initialized: false,

  initialize: async () => {
    try {
      // If we have a stored token, try to fetch the current user
      if (api.isAuthenticated()) {
        const user = await authApi.me();
        set({ user, isAuthenticated: true });
        wsClient.connect();
      }
      set({ initialized: true });
    } catch {
      // Token is invalid or expired — clear and continue
      api.clearTokens();
      set({ initialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);

      set({
        user: data.user,
        isAuthenticated: true,
      });

      // Connect WebSocket after login
      wsClient.connect();

      return { error: undefined };
    } catch (error) {
      const err = error as { error?: string; message?: string };
      return { error: new Error(err.error || err.message || 'Login failed') };
    }
  },

  // Alias for backwards compatibility
  login: async (email: string, password: string) => {
    return get().signIn(email, password);
  },

  signOut: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout — we clear state regardless
    }

    wsClient.disconnect();
    set({
      user: undefined,
      isAuthenticated: false,
    });
  },

  refreshSession: async () => {
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      api.clearTokens();
      wsClient.disconnect();
      set({ user: undefined, isAuthenticated: false });
    }
  },

  setSession: (session) => {
    if (session) {
      api.setTokens({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
      });
      set({ user: session.user, isAuthenticated: true });
      wsClient.connect();
    } else {
      api.clearTokens();
      wsClient.disconnect();
      set({ user: undefined, isAuthenticated: false });
    }
  },
}));

export const initializeAuth = () => {
  return useAuthStore.getState().initialize();
};
