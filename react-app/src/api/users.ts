/**
 * Users API module.
 */

import { api } from './client';

interface User {
  id: string;
  email: string;
  display_name: string | undefined;
  avatar_url: string | undefined;
  role: string;
  tokens: number | undefined;
  email_verified_at: string | undefined;
  created_at: string;
  updated_at: string;
}

export const usersApi = {
  search(query: string): Promise<User[]> {
    return api.get<User[]>(`/api/v1/users/search?q=${encodeURIComponent(query)}`);
  },

  get(id: string): Promise<User> {
    return api.get<User>(`/api/v1/users/${id}`);
  },

  update(id: string, data: { display_name?: string; avatar_url?: string }): Promise<User> {
    return api.put<User>(`/api/v1/users/${id}`, data);
  },

  uploadAvatar(id: string, file: File): Promise<{ avatar_url: string }> {
    return api.upload(`/api/v1/users/${id}/avatar`, file);
  },

  getProfile(id: string): Promise<User> {
    return api.get<User>(`/api/v1/users/${id}/profile`);
  },
};
