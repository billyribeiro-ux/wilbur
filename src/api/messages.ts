/**
 * Messages API — Replaces supabase.from('chatmessages').* calls.
 */

import { api } from './client';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  content_type: string;
  is_pinned: boolean;
  is_off_topic: boolean;
  is_deleted: boolean;
  user_display_name: string | undefined;
  user_avatar_url: string | undefined;
  created_at: string;
  updated_at: string;
}

export const messagesApi = {
  list(roomId: string, page = 1, perPage = 50): Promise<ChatMessage[]> {
    return api.get<ChatMessage[]>(
      `/api/v1/rooms/${roomId}/messages?page=${page}&per_page=${perPage}`
    );
  },

  create(roomId: string, content: string, contentType = 'text'): Promise<ChatMessage> {
    return api.post<ChatMessage>(`/api/v1/rooms/${roomId}/messages`, {
      content,
      content_type: contentType,
    });
  },

  update(roomId: string, messageId: string, content: string): Promise<ChatMessage> {
    return api.put<ChatMessage>(`/api/v1/rooms/${roomId}/messages/${messageId}`, { content });
  },

  delete(roomId: string, messageId: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${roomId}/messages/${messageId}`);
  },

  pin(roomId: string, messageId: string): Promise<void> {
    return api.post(`/api/v1/rooms/${roomId}/messages/${messageId}/pin`);
  },

  unpin(roomId: string, messageId: string): Promise<void> {
    return api.post(`/api/v1/rooms/${roomId}/messages/${messageId}/unpin`);
  },

  markOffTopic(roomId: string, messageId: string): Promise<void> {
    return api.post(`/api/v1/rooms/${roomId}/messages/${messageId}/off-topic`);
  },
};
