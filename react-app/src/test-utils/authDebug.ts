/**
 * authDebug.ts
 * ------------------------------------------------------------
 * Auth debugging utilities
 * Used to diagnose authentication state
 * Only logs in development mode
 */

import { api } from '../api/client';
import { authApi } from '../api/auth';
import { AuthError } from '../lib/errors';

/**
 * User type for debug utilities
 */
interface DebugUser {
  id: string;
  email: string;
  display_name: string | undefined;
  avatar_url: string | undefined;
  role: string;
  tokens: number | undefined;
  created_at: string;
}

/**
 * Check if we're in development mode
 */
const isDev = () => import.meta.env.DEV;

/**
 * Log a debug message only in development
 */
const debugLog = (message: string, data?: unknown) => {
  if (isDev()) {
    console.log(`[Auth Debug] ${message}`, data || '');
  }
};

/**
 * Get current authenticated user and validate auth state
 * @throws {AuthError} If not authenticated
 */
export async function getValidatedSession(): Promise<DebugUser> {
  if (!api.isAuthenticated()) {
    debugLog('No active session (no access token)');
    throw new AuthError('No active session');
  }

  try {
    const user = await authApi.me();

    debugLog('Session validated', {
      userId: user.id,
      email: user.email,
    });

    return user;
  } catch (err) {
    debugLog('Session validation failed:', err);
    throw new AuthError('Failed to validate session', { error: err });
  }
}

/**
 * Get current user ID
 * @throws {AuthError} If user is not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getValidatedSession();
  return user.id;
}

/**
 * Get current user object
 * @throws {AuthError} If user is not authenticated
 */
export async function getCurrentUser(): Promise<DebugUser> {
  return getValidatedSession();
}

/**
 * Check if user is currently authenticated
 * Returns false instead of throwing
 */
export async function isAuthenticated(): Promise<boolean> {
  return api.isAuthenticated();
}

/**
 * Test RLS policy on a table
 * Stubbed out: RLS is not relevant with the Rust backend.
 * Access control is handled by the API layer.
 */
export async function testRLSPolicy(
  _tableName: string,
  _operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
): Promise<boolean> {
  debugLog('testRLSPolicy is a no-op with the Rust backend (no RLS)');
  return true;
}

/**
 * Diagnose current auth state
 * Logs comprehensive auth information for debugging
 */
export async function diagnoseAuthState(): Promise<void> {
  if (!isDev()) return;

  console.group('[Auth Diagnose] Starting diagnosis...');

  try {
    const hasToken = api.isAuthenticated();
    console.log('[Auth Diagnose] Has access token:', hasToken);

    if (!hasToken) {
      console.warn('[Auth Diagnose] No access token present');
      console.groupEnd();
      return;
    }

    // Attempt to fetch current user from the API
    try {
      const user = await authApi.me();
      console.log('[Auth Diagnose] Current user:', {
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      });
    } catch (err) {
      console.error('[Auth Diagnose] Failed to fetch current user (token may be invalid):', err);
    }
  } catch (error) {
    console.error('[Auth Diagnose] Error during diagnosis:', error);
  }

  console.groupEnd();
}

/**
 * Clear auth state (for debugging only)
 */
export async function clearAuthState(): Promise<void> {
  if (!isDev()) {
    throw new Error('clearAuthState can only be called in development');
  }

  debugLog('Clearing auth state');
  try {
    await authApi.logout();
  } catch {
    // Ignore errors — just make sure tokens are cleared
  }
  api.clearTokens();
  debugLog('Auth state cleared');
}
