/**
 * Admin utility functions for user management
 * Microsoft TypeScript standards - no null usage
 */

import { api } from '../api/client';

export interface UserCount {
  total: number;
  admins: number;
  hosts: number;
  moderators: number;
  members: number;
}

/**
 * Get count of users by role
 */
export async function getUserCount(): Promise<UserCount> {
  try {
    const data = await api.get<UserCount>('/api/v1/admin/users/count');
    return data;
  } catch (error) {
    console.error('Error fetching user count:', error);
    return {
      total: 0,
      admins: 0,
      hosts: 0,
      moderators: 0,
      members: 0
    };
  }
}

/**
 * Delete all users (admin only function)
 * WARNING: This is a destructive operation
 */
export async function deleteAllUsers(): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete('/api/v1/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteAllUsers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
