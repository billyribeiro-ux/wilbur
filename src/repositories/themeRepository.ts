// src/repositories/themeRepository.ts
import { themesApi } from "../api/themes";
import type { Json } from "../types/database.types";

export interface UserThemeRow {
  id: string;
  user_id: string;
  name: string;
  description?: string | undefined;
  thumbnail_light?: string | undefined;
  thumbnail_dark?: string | undefined;
  theme_json: Json;
  created_at: string;
  updated_at: string;
}

export const themeRepository = {
  // Create or insert new theme
  async createTheme(theme: {
    userId: string;
    name: string;
    description?: string;
    themeJson: Json;
    thumbnailLight?: string;
    thumbnailDark?: string;
  }): Promise<UserThemeRow> {
    const data = await themesApi.create(theme.name, {
      ...(theme.themeJson as Record<string, unknown>),
      description: theme.description || undefined,
      thumbnail_light: theme.thumbnailLight || undefined,
      thumbnail_dark: theme.thumbnailDark || undefined,
    });

    // Map API response to UserThemeRow
    return {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      description: theme.description,
      thumbnail_light: theme.thumbnailLight,
      thumbnail_dark: theme.thumbnailDark,
      theme_json: data.theme_data as Json,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Read all themes by user
  async getThemesByUser(userId: string): Promise<UserThemeRow[]> {
    const data = await themesApi.list();
    // Filter by user on client side (server returns user's themes)
    return (data || []).map(theme => ({
      id: theme.id,
      user_id: theme.user_id,
      name: theme.name,
      theme_json: theme.theme_data as Json,
      created_at: theme.created_at,
      updated_at: theme.updated_at,
    }));
  },

  // Update theme
  async updateTheme(
    id: string,
    updates: Partial<Pick<UserThemeRow, "name" | "description" | "theme_json" | "thumbnail_light" | "thumbnail_dark">>
  ): Promise<UserThemeRow> {
    const apiUpdates: { name?: string; theme_data?: Record<string, unknown> } = {};
    if (updates.name) apiUpdates.name = updates.name;
    if (updates.theme_json) apiUpdates.theme_data = updates.theme_json as Record<string, unknown>;

    const data = await themesApi.update(id, apiUpdates);

    return {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      description: updates.description,
      thumbnail_light: updates.thumbnail_light,
      thumbnail_dark: updates.thumbnail_dark,
      theme_json: data.theme_data as Json,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Delete theme
  async deleteTheme(id: string, _userId: string): Promise<void> {
    await themesApi.delete(id);
  },
};
