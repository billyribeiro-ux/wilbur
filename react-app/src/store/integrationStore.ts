import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { api } from '../api/client';

interface Integration {
  id: string;
  provider: string;
  connected: boolean;
  display_name?: string;
  avatar_url?: string;
  user_id: string;
}

interface IntegrationState {
  connections: Integration[];
  isLoading: boolean;
  loadConnections: (userId: string) => Promise<void>;
  addConnection: (connection: Integration) => void;
  removeConnection: (provider: string) => void;
  getConnection: (provider: string) => Integration | undefined;
  isConnected: (provider: string) => boolean;
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      connections: [],
      isLoading: false,

      loadConnections: async (_userId: string) => {
        set({ isLoading: true });
        try {
          // Fetch integration status from the Rust backend
          // The backend stores tokens securely — we only need connection status
          const providers = ['spotify', 'x', 'linkedin'] as const;
          const connections: Integration[] = [];

          for (const provider of providers) {
            try {
              const config = await api.get<{ client_id_configured: boolean }>(`/api/v1/integrations/${provider}/config`);
              if (config.client_id_configured) {
                connections.push({
                  id: `${_userId}-${provider}`,
                  provider,
                  connected: true,
                  user_id: _userId,
                });
              }
            } catch {
              // Provider not connected — skip
            }
          }

          set({ connections, isLoading: false });
        } catch (error) {
          console.error('[IntegrationStore] Failed to load connections:', error);
          set({ isLoading: false });
        }
      },

      addConnection: (connection) => {
        set((state) => ({
          connections: [...state.connections.filter(c => c.provider !== connection.provider), connection]
        }));
      },

      removeConnection: (provider) => {
        set((state) => ({
          connections: state.connections.filter(c => c.provider !== provider)
        }));
      },

      getConnection: (provider) => {
        return get().connections.find(c => c.provider === provider);
      },

      isConnected: (provider) => {
        return get().connections.some(c => c.provider === provider);
      },
    }),
    {
      name: 'integration-storage',
    }
  )
);
