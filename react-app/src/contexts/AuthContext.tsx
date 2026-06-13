/**
 * AuthContext.tsx
 * ------------------------------------------------------------
 * Authentication context provider
 * Provides auth state to entire application with session management
 * Microsoft-standard: Centralized auth state management
 *
 * Wraps the Zustand authStore to provide React context-based auth access.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { useAuthStore } from '../store/authStore';

/**
 * Authenticated user interface
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Auth context type
 */
export interface AuthContextType {
  user: AuthUser | undefined;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | undefined;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Create auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Convert authStore user to AuthUser
 */
function convertUser(storeUser: { id: string; email: string; display_name?: string; avatar_url?: string }): AuthUser {
  return {
    id: storeUser.id,
    email: storeUser.email,
    displayName: storeUser.display_name,
    avatarUrl: storeUser.avatar_url,
  };
}

/**
 * Auth provider component
 * Wraps the application and provides auth state
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore();
  const [error, setError] = useState<Error | undefined>(undefined);

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    if (!store.initialized) {
      store.initialize();
    }
  }, [store]);

  /**
   * Sign out function
   */
  const signOut = useCallback(async () => {
    try {
      setError(undefined);
      await store.signOut();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sign out');
      setError(error);
      throw error;
    }
  }, [store]);

  /**
   * Refresh session function
   */
  const refreshSession = useCallback(async () => {
    try {
      setError(undefined);
      await store.refreshSession();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh session');
      setError(error);
      throw error;
    }
  }, [store]);

  const user = store.user ? convertUser(store.user) : undefined;

  const value: AuthContextType = {
    user,
    isAuthenticated: store.isAuthenticated,
    loading: !store.initialized,
    error,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 * Provides access to auth context
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
