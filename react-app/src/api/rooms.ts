/**
 * Rooms API module.
 */

import { api } from './client';

interface Room {
  id: string;
  tenant_id: string | undefined;
  name: string;
  title: string | undefined;
  description: string | undefined;
  max_members: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RoomMembership {
  id: string;
  user_id: string;
  room_id: string;
  role: string;
  status: string;
  created_at: string;
}

export const roomsApi = {
  list(page = 1, perPage = 50): Promise<Room[]> {
    return api.get<Room[]>(`/api/v1/rooms?page=${page}&per_page=${perPage}`);
  },

  get(id: string): Promise<Room> {
    return api.get<Room>(`/api/v1/rooms/${id}`);
  },

  create(data: { name: string; title?: string; description?: string; tenant_id?: string }): Promise<Room> {
    return api.post<Room>('/api/v1/rooms', data);
  },

  update(id: string, data: Partial<Room>): Promise<Room> {
    return api.put<Room>(`/api/v1/rooms/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${id}`);
  },

  listMembers(roomId: string): Promise<RoomMembership[]> {
    return api.get<RoomMembership[]>(`/api/v1/rooms/${roomId}/members`);
  },

  invite(roomId: string, userId: string, role = 'member'): Promise<RoomMembership> {
    return api.post<RoomMembership>(`/api/v1/rooms/${roomId}/members`, { user_id: userId, role });
  },

  removeMember(roomId: string, userId: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${roomId}/members/${userId}`);
  },

  updateMemberRole(roomId: string, userId: string, role: string): Promise<RoomMembership> {
    return api.put<RoomMembership>(`/api/v1/rooms/${roomId}/members/${userId}/role`, { role });
  },

  listByTenant(tenantId: string): Promise<Room[]> {
    return api.get<Room[]>(`/api/v1/rooms/by-tenant/${tenantId}`);
  },
};
