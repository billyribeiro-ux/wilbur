/**
 * Auth API — Replaces supabase.auth.* calls.
 */

import { api } from './client';

interface UserResponse {
  id: string;
  email: string;
  display_name: string | undefined;
  avatar_url: string | undefined;
  role: string;
  tokens: number | undefined;
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserResponse;
}

export const authApi = {
  async register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/api/v1/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    api.setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/api/v1/auth/login', { email, password });
    api.setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/api/v1/auth/logout');
    api.clearTokens();
  },

  async me(): Promise<UserResponse> {
    return api.get<UserResponse>('/api/v1/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/v1/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  },
};
