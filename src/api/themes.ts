/**
 * Themes API module.
 */

import { api } from './client';

interface UserTheme {
  id: string;
  user_id: string;
  name: string;
  theme_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const themesApi = {
  list(): Promise<UserTheme[]> {
    return api.get<UserTheme[]>('/api/v1/themes');
  },

  get(id: string): Promise<UserTheme> {
    return api.get<UserTheme>(`/api/v1/themes/${id}`);
  },

  create(name: string, themeData: Record<string, unknown>, isActive = false): Promise<UserTheme> {
    return api.post<UserTheme>('/api/v1/themes', {
      name,
      theme_data: themeData,
      is_active: isActive,
    });
  },

  update(id: string, data: { name?: string; theme_data?: Record<string, unknown>; is_active?: boolean }): Promise<UserTheme> {
    return api.put<UserTheme>(`/api/v1/themes/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/api/v1/themes/${id}`);
  },
};
