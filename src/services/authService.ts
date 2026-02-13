// Auth service using authApi / usersApi
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import { api } from '../api/client';

// Type definitions for auth operations (preserved for consumers)
export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: { id: string; email: string; display_name?: string; role: string } | undefined;
  session: { access_token: string } | undefined;
  error: Error | undefined;
}

export interface ProfileResponse {
  profile: Record<string, unknown> | undefined;
  error: Error | undefined;
}

// Error severity levels for centralized reporting
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Centralized error reporting utility
export function reportError(
  error: Error | string,
  severity: ErrorSeverity,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const timestamp = new Date().toISOString();

  const logMethod = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
    ? console.error
    : severity === ErrorSeverity.MEDIUM
    ? console.warn
    : console.log;

  logMethod(
    `[ERROR ${severity.toUpperCase()}] ${timestamp}`,
    errorMessage,
    context || {},
    error instanceof Error ? error.stack : ''
  );

  // TODO: Send to external service (Sentry, LogRocket, etc.)
}

// Retry utility for transient failures
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Operation failed');

      if (attempt === maxRetries) {
        console.error(`[retryOperation] All ${maxRetries} attempts failed`);
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[retryOperation] Attempt ${attempt} failed, retrying in ${delay}ms...`,
        lastError.message
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

class AuthService {
  // Enhanced sign in with retry logic and error reporting
  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    try {
      const data = await retryOperation(async () => {
        return await authApi.login(email, password);
      });

      const user = {
        id: data.user.id,
        email: data.user.email,
        display_name: data.user.display_name,
        role: data.user.role,
      };

      // ENTERPRISE PATTERN: Validate user profile exists (no auto-creation)
      await this.validateUserProfile(user.id);

      return {
        user,
        session: { access_token: data.access_token },
        error: undefined,
      };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.HIGH, {
        component: 'AuthService',
        action: 'signIn',
        metadata: { email }
      });
      return {
        user: undefined,
        session: undefined,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      };
    }
  }

  // Enhanced sign up with profile creation
  async signUp({ email, password, displayName }: SignUpCredentials): Promise<AuthResponse> {
    try {
      const data = await retryOperation(async () => {
        return await authApi.register(email, password, displayName);
      });

      const user = {
        id: data.user.id,
        email: data.user.email,
        display_name: data.user.display_name || displayName,
        role: data.user.role,
      };

      return {
        user,
        session: { access_token: data.access_token },
        error: undefined,
      };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.HIGH, {
        component: 'AuthService',
        action: 'signUp',
        metadata: { email, displayName }
      });
      return {
        user: undefined,
        session: undefined,
        error: error instanceof Error ? error : new Error('Sign up failed'),
      };
    }
  }

  // Get user profile from the API
  async getUserProfile(userId: string): Promise<ProfileResponse> {
    try {
      const profile = await retryOperation(async () => {
        return await usersApi.getProfile(userId);
      });

      return { profile: profile as unknown as Record<string, unknown>, error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'AuthService',
        action: 'getUserProfile',
        userId
      });
      return {
        profile: undefined,
        error: error instanceof Error ? error : new Error('Failed to get profile'),
      };
    }
  }

  /**
   * ENTERPRISE PATTERN: Validate user profile exists (Microsoft/Google standard)
   * NEVER auto-creates - registration must be explicit
   * Throws error if user record missing (incomplete registration)
   */
  private async validateUserProfile(userId: string): Promise<void> {
    try {
      const profile = await usersApi.getProfile(userId);

      if (!profile) {
        console.error('[AuthService] User record not found in database');
        console.error('[AuthService] This indicates incomplete registration');
        throw new Error('Account not found. Please complete registration or contact support.');
      }

      console.log('[AuthService] User profile validated:', profile.email);

      // Update last activity timestamp
      await usersApi.update(userId, {}).catch(() => {
        // Non-critical: ignore update failures
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Account not found')) {
        throw error; // Re-throw validation errors
      }
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.HIGH, {
        component: 'AuthService',
        action: 'validateUserProfile',
        userId
      });
      throw new Error('Failed to validate user account. Please try again.');
    }
  }

  // Refresh current session — the API client handles token refresh automatically
  async refreshSession(): Promise<{ session: { access_token: string } | undefined; error?: Error }> {
    try {
      // The API client auto-refreshes on 401; calling me() verifies the session is still valid
      await authApi.me();
      const accessToken = api.getAccessToken();
      return {
        session: accessToken ? { access_token: accessToken } : undefined,
        error: undefined,
      };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'AuthService',
        action: 'refreshSession'
      });
      return {
        session: undefined,
        error: error instanceof Error ? error : new Error('Failed to refresh session'),
      };
    }
  }

  // Sign out with cleanup
  async signOut(): Promise<{ error?: Error }> {
    try {
      await authApi.logout();
      return { error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'AuthService',
        action: 'signOut'
      });
      return {
        error: error instanceof Error ? error : new Error('Sign out failed'),
      };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<{ user: { id: string; email: string; display_name?: string; role: string } | undefined; error?: Error }> {
    try {
      if (!api.isAuthenticated()) {
        return { user: undefined, error: undefined };
      }
      const user = await authApi.me();
      return {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
        },
        error: undefined,
      };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.LOW, {
        component: 'AuthService',
        action: 'getCurrentUser'
      });
      return {
        user: undefined,
        error: error instanceof Error ? error : new Error('Failed to get current user'),
      };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error?: Error }> {
    try {
      await authApi.forgotPassword(email);
      return { error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'AuthService',
        action: 'resetPassword',
        metadata: { email }
      });
      return {
        error: error instanceof Error ? error : new Error('Failed to send reset email'),
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
