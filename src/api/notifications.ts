/**
 * Notifications API module.
 */

import { api } from './client';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | undefined;
  notification_type: string;
  reference_id: string | undefined;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list(): Promise<{ user_id: string; notifications: Notification[] }> {
    return api.get('/api/v1/notifications');
  },

  markRead(id: string): Promise<void> {
    return api.post(`/api/v1/notifications/${id}/read`);
  },

  markAllRead(): Promise<{ updated_count: number }> {
    return api.post('/api/v1/notifications/read-all');
  },

  delete(id: string): Promise<void> {
    return api.delete(`/api/v1/notifications/${id}`);
  },
};
