/**
 * Private Chats API module.
 */

import { api } from './client';

interface PrivateChat {
  id: string;
  participant_one: string;
  participant_two: string;
  created_at: string;
  updated_at: string;
}

interface PrivateMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export const privateChatsApi = {
  list(page = 1, perPage = 50): Promise<{ chats: PrivateChat[] }> {
    return api.get(`/api/v1/dm?page=${page}&per_page=${perPage}`);
  },

  create(userId: string): Promise<PrivateChat> {
    return api.post<PrivateChat>('/api/v1/dm', { user_id: userId });
  },

  findByUser(userId: string): Promise<{ chat: PrivateChat | undefined }> {
    return api.get(`/api/v1/dm/user/${userId}`);
  },

  listMessages(chatId: string, page = 1, perPage = 50): Promise<{ messages: PrivateMessage[] }> {
    return api.get(`/api/v1/dm/${chatId}/messages?page=${page}&per_page=${perPage}`);
  },

  sendMessage(chatId: string, content: string): Promise<PrivateMessage> {
    return api.post<PrivateMessage>(`/api/v1/dm/${chatId}/messages`, { content });
  },
};
