// src/lib/auth.ts
// ──────────────────────────────────────────────
// Authentication utilities and functions (Wilbur API)
// ──────────────────────────────────────────────
import { authApi } from '../api/auth';

/**
 * Local AuthUser type
 */
export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
}

export interface RegisterUserInput {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

export interface AuthResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  serviceError?: string;
}

export interface UserData {
  user: AuthUser;
}

// ──────────────────────────────────────────────
// User Registration
// ──────────────────────────────────────────────
export async function registerUser(
  input: RegisterUserInput
): Promise<AuthResult<{ message: string; user_id: string; email_verification_skipped?: boolean }>> {
  try {
    const data = await authApi.register(input.email, input.password, input.displayName);
    return {
      success: true,
      data: {
        message: data.message,
        user_id: data.user_id,
        email_verification_skipped: data.email_verification_skipped,
      },
    };
  } catch (error) {
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Registration failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Password Login
// ──────────────────────────────────────────────
export async function loginWithPassword(input: LoginWithPasswordInput): Promise<AuthResult<UserData>> {
  try {
    const data = await authApi.login(input.email, input.password);
    return {
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.display_name,
          avatar_url: data.user.avatar_url,
          role: data.user.role,
        },
      },
    };
  } catch (error) {
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Login failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Password Reset
// ──────────────────────────────────────────────
export async function requestPasswordReset(
  email: string
): Promise<AuthResult<{ message: string }>> {
  try {
    await authApi.forgotPassword(email);
    return {
      success: true,
      data: {
        message: 'Password reset email sent',
      },
    };
  } catch (error) {
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Password reset request failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Resend Verification Email
// ──────────────────────────────────────────────
export async function resendVerificationEmail(
  email: string
): Promise<AuthResult<{ message: string }>> {
  try {
    const data = await authApi.resendVerification(email);
    return {
      success: true,
      data: {
        message: data.message,
      },
    };
  } catch (error) {
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Resend verification failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Sign Out
// ──────────────────────────────────────────────
export async function signOut(): Promise<AuthResult<{ message: string }>> {
  try {
    await authApi.logout();
    return {
      success: true,
      data: {
        message: 'Sign out successful',
      },
    };
  } catch (error) {
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Sign out failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Validation Functions
// ──────────────────────────────────────────────
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/** Sign-up password rules — must match `wilbur-api` `CreateUserRequest` (min 12). */
export function validateSignupPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  return validateSignupPassword(password);
}

export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  if (!displayName) {
    return { valid: false, error: 'Display name is required' };
  }

  if (displayName.length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (displayName.length > 100) {
    return { valid: false, error: 'Display name must be at most 100 characters' };
  }

  return { valid: true };
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }

  return { valid: true };
}

// ──────────────────────────────────────────────
// Error Display Info
// ──────────────────────────────────────────────
export function getErrorDisplayInfo(error: string): { message: string; type: 'error' | 'warning' | 'info' } {
  const errorMap: Record<string, { message: string; type: 'error' | 'warning' | 'info' }> = {
    'Invalid login credentials': {
      message: 'Invalid email or password. Please check your credentials and try again.',
      type: 'error',
    },
    'Please verify your email address before logging in': {
      message: 'Please check your email and click the verification link before logging in.',
      type: 'warning',
    },
    'User already registered': {
      message: 'An account with this email already exists. Please try logging in instead.',
      type: 'info',
    },
    'Email already registered': {
      message: 'An account with this email already exists. Please try logging in instead.',
      type: 'info',
    },
    'Password should be at least 8 characters': {
      message: 'Password must be at least 12 characters long.',
      type: 'error',
    },
    'Signup requires a valid password': {
      message: 'Please enter a valid password.',
      type: 'error',
    },
  };

  return errorMap[error] || { message: error, type: 'error' };
}
