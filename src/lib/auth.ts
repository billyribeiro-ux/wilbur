// src/lib/auth.ts
// ──────────────────────────────────────────────
// Authentication utilities and functions
// ──────────────────────────────────────────────
import { authApi } from '../api/auth';
import { api } from '../api/client';

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
  user?: AuthUser;  // For verifyOTP
  error?: string;
  serviceError?: string;
}

export interface UserData {
  user: AuthUser;
}

// ──────────────────────────────────────────────
// User Registration
// ──────────────────────────────────────────────
export async function registerUser(input: RegisterUserInput): Promise<AuthResult<UserData>> {
  try {
    console.log('[registerUser] Starting registration for:', input.email);

    const data = await authApi.register(input.email, input.password, input.displayName);

    console.log('[registerUser] Registration successful for:', input.email);
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
    console.error('[registerUser] Registration failed:', error);
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
    console.log('[loginWithPassword] Starting login for:', input.email);

    const data = await authApi.login(input.email, input.password);

    console.log('[loginWithPassword] Login successful for:', input.email);
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
    console.error('[loginWithPassword] Login failed:', error);
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'Login failed'),
    };
  }
}

// ──────────────────────────────────────────────
// OTP Request
// ──────────────────────────────────────────────
export async function requestOTP(email: string): Promise<AuthResult<{ message: string }>> {
  try {
    console.log('[requestOTP] Requesting OTP for:', email);

    await api.post('/api/v1/auth/otp/request', { email });

    console.log('[requestOTP] OTP sent successfully to:', email);
    return {
      success: true,
      data: {
        message: 'OTP sent successfully',
      },
    };

  } catch (error) {
    console.error('[requestOTP] OTP request failed:', error);
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'OTP request failed'),
    };
  }
}

// ──────────────────────────────────────────────
// OTP Verification
// ──────────────────────────────────────────────
export async function verifyOTP(email: string, token: string): Promise<AuthResult<{ user: AuthUser }>> {
  try {
    console.log('[verifyOTP] Verifying OTP for:', email);

    const data = await api.post<{ user: AuthUser }>('/api/v1/auth/otp/verify', { email, token });

    if (!data.user) {
      return {
        success: false,
        error: 'No user data returned',
      };
    }

    console.log('[verifyOTP] OTP verification successful for:', email);
    return {
      success: true,
      user: data.user,
    };

  } catch (error) {
    console.error('[verifyOTP] OTP verification failed:', error);
    const err = error as { error?: string; message?: string };
    return {
      success: false,
      error: err.error || (error instanceof Error ? error.message : 'OTP verification failed'),
    };
  }
}

// ──────────────────────────────────────────────
// Password Reset
// ──────────────────────────────────────────────
export async function requestPasswordReset(email: string): Promise<AuthResult<{ message: string }>> {
  try {
    console.log('[requestPasswordReset] Requesting password reset for:', email);

    await authApi.forgotPassword(email);

    console.log('[requestPasswordReset] Password reset email sent to:', email);
    return {
      success: true,
      data: {
        message: 'Password reset email sent',
      },
    };

  } catch (error) {
    console.error('[requestPasswordReset] Password reset request failed:', error);
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
export async function resendVerificationEmail(email: string): Promise<AuthResult<{ message: string }>> {
  try {
    console.log('[resendVerificationEmail] Resending verification for:', email);

    await api.post('/api/v1/auth/verify/resend', { email });

    console.log('[resendVerificationEmail] Verification email resent to:', email);
    return {
      success: true,
      data: {
        message: 'Verification email resent',
      },
    };

  } catch (error) {
    console.error('[resendVerificationEmail] Resend verification failed:', error);
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
    console.log('[signOut] Signing out user');

    await authApi.logout();

    console.log('[signOut] Sign out successful');
    return {
      success: true,
      data: {
        message: 'Sign out successful',
      },
    };

  } catch (error) {
    console.error('[signOut] Sign out failed:', error);
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

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
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

export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  if (!displayName) {
    return { valid: false, error: 'Display name is required' };
  }

  if (displayName.length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (displayName.length > 50) {
    return { valid: false, error: 'Display name must be less than 50 characters' };
  }

  return { valid: true };
}

export function validatePasswordMatch(password: string, confirmPassword: string): { valid: boolean; error?: string } {
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
    'Email not confirmed': {
      message: 'Please check your email and click the verification link before logging in.',
      type: 'warning',
    },
    'User already registered': {
      message: 'An account with this email already exists. Please try logging in instead.',
      type: 'info',
    },
    'Password should be at least 8 characters': {
      message: 'Password must be at least 8 characters long.',
      type: 'error',
    },
    'Signup requires a valid password': {
      message: 'Please enter a valid password.',
      type: 'error',
    },
  };

  return errorMap[error] || { message: error, type: 'error' };
}
