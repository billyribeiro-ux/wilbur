/**
 * =====================================================================
 * useThemeActions.ts
 * ---------------------------------------------------------------------
 * Central business logic for creating, updating, and applying user themes.
 * Uses API modules for persistence.
 * =====================================================================
 */

import { useState, useCallback, useEffect } from 'react';

import { roomsApi } from '../api/rooms';
import { messagesApi } from '../api/messages';
import { generateThemeThumbnails } from "../components/theme/generateThemeThumbnail";
import type { UserThemeRow } from "../repositories/themeRepository";
import { themeRepository } from "../repositories/themeRepository";
import type { Json } from "../types/database.types";
import { authService, reportError, ErrorSeverity } from '../services/authService';
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

import type { Room, Database, ChatMessage } from '../types/database.types';

type InsertRoom = Database['public']['Tables']['rooms']['Insert'];


export function useThemeActions() {
  const themeStore = useThemeStore();
  const addToast = useToastStore((s) => s.addToast);

  // ===============================================================
  // APPLY THEME (permanent)
  // ===============================================================
  const applyTheme = (themeJson: Record<string, unknown>) => {
    try {
      themeStore.importTheme(themeJson);
      addToast("Theme applied successfully!", "success");
    } catch (error) {
      console.error("[useThemeActions] applyTheme failed:", error);
      addToast("Failed to apply theme.", "error");
    }
  };

  // ===============================================================
  // PREVIEW THEME (temporary)
  // ===============================================================
  const previewTheme = (themeJson: Record<string, unknown>, durationMs: number = 3500) => {
    try {
      themeStore.importTheme(themeJson);
      if (durationMs < 999999) {
        setTimeout(() => themeStore.restoreLastTheme(), durationMs);
      }
    } catch (error) {
      console.error("[useThemeActions] previewTheme failed:", error);
      addToast("Failed to preview theme.", "error");
    }
  };

  // ===============================================================
  // END PREVIEW (manual revert)
  // ===============================================================
  const endPreview = () => {
    try {
      themeStore.restoreLastTheme();
      addToast("Preview reverted.", "info");
    } catch (error) {
      console.error("[useThemeActions] endPreview failed:", error);
    }
  };

  // ===============================================================
  // LOAD USER THEMES
  // ===============================================================
  const loadMyThemes = async (userId: string): Promise<UserThemeRow[]> => {
    try {
      const data = await themeRepository.getThemesByUser(userId);
      return data || [];
    } catch (error) {
      console.error("[useThemeActions] loadMyThemes failed:", error);
      addToast("Failed to load themes.", "error");
      return [];
    }
  };

  // ===============================================================
  // SAVE CURRENT THEME
  // ===============================================================
  const saveCurrentTheme = async (
    userId: string,
    name: string,
    description?: string
  ) => {
    try {
      const themeJsonObject = themeStore.buildThemeJson(themeStore.currentTheme!) as Record<string, unknown>;
      const { light, dark } = await generateThemeThumbnails(themeJsonObject);

      await themeRepository.createTheme({
        userId,
        name,
        description,
        themeJson: themeJsonObject as Json,
        thumbnailLight: light,
        thumbnailDark: dark,
      });

      addToast(`Theme "${name}" saved successfully!`, "success");
    } catch (error) {
      console.error("[useThemeActions] saveCurrentTheme failed:", error);
      addToast("Failed to save theme.", "error");
    }
  };

  // ===============================================================
  // UPDATE EXISTING THEME
  // ===============================================================
  const updateSavedTheme = async (
    themeId: string,
    _userId: string,
    name?: string,
    description?: string
  ) => {
    try {
      const themeJsonObject = themeStore.buildThemeJson(themeStore.currentTheme!) as Record<string, unknown>;
      const { light, dark } = await generateThemeThumbnails(themeJsonObject);

      await themeRepository.updateTheme(themeId, {
        name,
        description,
        theme_json: themeJsonObject as Json,
        thumbnail_light: light,
        thumbnail_dark: dark,
      });

      addToast("Theme updated successfully!", "success");
    } catch (error) {
      console.error("[useThemeActions] updateSavedTheme failed:", error);
      addToast("Failed to update theme.", "error");
    }
  };

  // ===============================================================
  // DELETE THEME
  // ===============================================================
  const deleteTheme = async (themeId: string, userId: string) => {
    try {
      await themeRepository.deleteTheme(themeId, userId);
      addToast("Theme deleted successfully!", "success");
    } catch (error) {
      console.error("[useThemeActions] deleteTheme failed:", error);
      addToast("Failed to delete theme.", "error");
    }
  };

  // ===============================================================
  // PUBLIC API
  // ===============================================================
  return {
    applyTheme,
    previewTheme,
    endPreview,
    loadMyThemes,
    saveCurrentTheme,
    updateSavedTheme,
    deleteTheme,
  };
}

/**
 * Hook for room service operations with consistent error handling
 */
export function useRoomService() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const createRoom = useCallback(async (roomData: InsertRoom): Promise<Room | undefined> => {
    try {
      setLoading(true);
      setError(undefined);

      const data = await roomsApi.create({
        name: roomData.name || roomData.title || '',
        title: roomData.title,
        description: roomData.description || undefined,
        tenant_id: roomData.tenant_id || undefined,
      });

      return data as unknown as Room;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create room');
      setError(error);
      reportError(error, ErrorSeverity.HIGH, {
        component: 'useRoomService',
        action: 'createRoom',
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRoomsByTenant = useCallback(async (tenantId: string): Promise<Room[]> => {
    try {
      setLoading(true);
      setError(undefined);

      const data = await roomsApi.listByTenant(tenantId);
      return (data || []) as unknown as Room[];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get rooms');
      setError(error);
      reportError(error, ErrorSeverity.MEDIUM, {
        component: 'useRoomService',
        action: 'getRoomsByTenant',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRoom = useCallback(async (roomId: string, updates: Partial<InsertRoom>): Promise<Room | undefined> => {
    try {
      setLoading(true);
      setError(undefined);

      const data = await roomsApi.update(roomId, updates as Record<string, unknown>);
      return data as unknown as Room;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update room');
      setError(error);
      reportError(error, ErrorSeverity.MEDIUM, {
        component: 'useRoomService',
        action: 'updateRoom',
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(undefined);

      await roomsApi.delete(roomId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete room');
      setError(error);
      reportError(error, ErrorSeverity.HIGH, {
        component: 'useRoomService',
        action: 'deleteRoom',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, createRoom, getRoomsByTenant, updateRoom, deleteRoom };
}

/**
 * Hook for auth service operations with consistent error handling
 */
export function useAuthService() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(undefined);

      const result = await authService.signIn({ email, password });

      if (result.error) throw result.error;
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      setError(error);
      reportError(error, ErrorSeverity.HIGH, {
        component: 'useAuthService',
        action: 'signIn',
      });
      return { user: null, session: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(undefined);

      const result = await authService.signUp({ email, password, displayName });

      if (result.error) throw result.error;
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign up failed');
      setError(error);
      reportError(error, ErrorSeverity.HIGH, {
        component: 'useAuthService',
        action: 'signUp',
      });
      return { user: null, session: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(undefined);

      const result = await authService.getUserProfile(userId);

      if (result.error) throw result.error;
      return result.profile;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get profile');
      setError(error);
      reportError(error, ErrorSeverity.MEDIUM, {
        component: 'useAuthService',
        action: 'getUserProfile',
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, signIn, signUp, getUserProfile };
}

/**
 * Consolidated real-time subscription hook for messages
 * Note: With the new API, this uses polling instead of realtime subscriptions.
 */
export function useRealtimeMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const data = await messagesApi.list(roomId);
        if (!cancelled) {
          setMessages(data as unknown as ChatMessage[]);
        }
      } catch (err) {
        console.error('[useRealtimeMessages] Failed to fetch messages:', err);
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      console.log('[useRealtimeMessages] Unsubscribing');
    };
  }, [roomId]);

  return messages;
}
