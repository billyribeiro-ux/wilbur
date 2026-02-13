/**
 * API Service — Centralized API calls for Wilbur Trading Room.
 * Delegates to typed API modules for the Rust backend.
 */

import { api } from '../api/client';
import { roomsApi } from '../api/rooms';
import { messagesApi } from '../api/messages';
import { alertsApi } from '../api/alerts';
import { pollsApi } from '../api/polls';
import { storageApi } from '../api/storage';
import { usersApi } from '../api/users';
import type { Room, ChatMessage, Alert, RoomMembership, Poll } from '../types/database.types';

import { queryCache, CacheKeys, invalidateRoomCache } from '../utils/queryCache';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ApiService {
  /**
   * Generic GET request
   */
  public async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const data = await api.get<T>(endpoint);
      return { data, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), success: false };
    }
  }

  /**
   * Generic POST request
   */
  public async post<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    try {
      const data = await api.post<T>(endpoint, body);
      return { data, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), success: false };
    }
  }

  /**
   * Generic PUT request
   */
  public async put<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    try {
      const data = await api.put<T>(endpoint, body);
      return { data, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), success: false };
    }
  }

  /**
   * Generic DELETE request
   */
  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const data = await api.delete<T>(endpoint);
      return { data, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), success: false };
    }
  }
}

// Singleton instance
export const apiService = new ApiService();

// ======================================================
// Room-specific functions
// ======================================================

export const getUserRooms = async (_userId: string, useCache = true): Promise<Room[]> => {
  try {
    const cacheKey = CacheKeys.userRooms(_userId);

    if (useCache) {
      const cached = queryCache.get<Room[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await roomsApi.list();

    if (useCache && data) {
      queryCache.set(cacheKey, data as Room[], 5 * 60 * 1000);
    }

    return (data as Room[]) || [];
  } catch (error) {
    console.error('[API] Error fetching user rooms:', error);
    throw error;
  }
};

export const deleteRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    await roomsApi.delete(roomId);
    invalidateRoomCache(roomId);
    queryCache.invalidate(CacheKeys.userRooms(userId));
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
};

export default apiService;

// ======================================================
// Messages
// ======================================================

export const getRoomMessages = async (
  roomId: string,
  limit = 100,
  _offset = 0,
  useCache = true
) => {
  try {
    const page = Math.floor(_offset / limit) + 1;
    const cacheKey = `${CacheKeys.roomMessages(roomId)}:${limit}:${_offset}`;

    if (useCache && _offset === 0) {
      const cached = queryCache.get<ChatMessage[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await messagesApi.list(roomId, page, limit);

    if (useCache && _offset === 0 && data) {
      queryCache.set(cacheKey, data, 2 * 60 * 1000);
    }

    return (data as ChatMessage[]) || [];
  } catch (error) {
    console.error('[API] Error fetching room messages:', error);
    return [];
  }
};

// ======================================================
// Alerts
// ======================================================

export const getRoomAlerts = async (
  roomId: string,
  _limit = 50,
  _offset = 0,
  useCache = true
) => {
  try {
    const cacheKey = `${CacheKeys.roomAlerts(roomId)}:${_limit}:${_offset}`;

    if (useCache && _offset === 0) {
      const cached = queryCache.get<Alert[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await alertsApi.list(roomId);

    if (useCache && _offset === 0 && data) {
      queryCache.set(cacheKey, data, 1 * 60 * 1000);
    }

    return (data as Alert[]) || [];
  } catch (error) {
    console.error('[API] getRoomAlerts: Fatal error:', error);
    return [];
  }
};

/**
 * @deprecated Use getRoomAlerts(roomId) instead.
 */
export const getTenantAlerts = async (_tenantId: string) => {
  return [];
};

// ======================================================
// Membership
// ======================================================

export const getUserRoomRole = async (userId: string, roomId: string): Promise<RoomMembership | undefined> => {
  try {
    const members = await roomsApi.listMembers(roomId);
    const membership = members.find((m) => m.user_id === userId);
    return membership as RoomMembership | undefined;
  } catch (error) {
    console.error('[API] getUserRoomRole: Error:', error);
    return undefined;
  }
};

export const ensureUserRoomMembership = async (userId: string, roomId: string): Promise<RoomMembership | undefined> => {
  return validateUserRoomMembership(userId, roomId);
};

export const validateUserRoomMembership = async (userId: string, roomId: string): Promise<RoomMembership | undefined> => {
  try {
    const existing = await getUserRoomRole(userId, roomId);
    if (!existing) {
      console.error('[API] validateUserRoomMembership: User not a member of this room');
      return undefined;
    }
    return existing;
  } catch (error) {
    console.error('[API] validateUserRoomMembership: Error:', error);
    return undefined;
  }
};

export const createRoomMembership = async (
  roomId: string,
  userId: string,
  _role: 'admin' | 'member' = 'member',
  _invitedBy: string
): Promise<RoomMembership | undefined> => {
  try {
    const data = await roomsApi.invite(roomId, userId);
    return data as unknown as RoomMembership;
  } catch (error) {
    console.error('[API] createRoomMembership: Error:', error);
    return undefined;
  }
};

export const getActiveMediaTracks = async (_roomId: string) => {
  return [];
};

export const uploadAlertMedia = async (
  file: File,
  _tenantId: string,
  roomId: string,
  _userId: string
): Promise<string> => {
  // Upload via storage API, then return the URL
  const result = await storageApi.upload(file, 'alert-media');
  return result.url;
};

export const createAlert = async (data: Record<string, unknown>) => {
  try {
    const roomId = data.room_id as string;
    const alertData = await alertsApi.create(roomId, {
      title: data.title as string,
      body: data.body as string | undefined,
      alert_type: data.alert_type as string | undefined,
      ticker_symbol: data.ticker_symbol as string | undefined,
      entry_price: data.entry_price as number | undefined,
      stop_loss: data.stop_loss as number | undefined,
      take_profit: data.take_profit as number | undefined,
      legal_disclosure: data.legal_disclosure as string | undefined,
    });

    if (alertData?.room_id) {
      invalidateRoomCache(alertData.room_id);
    }

    return alertData;
  } catch (error) {
    console.error('[API] Error creating alert:', error);
    throw error;
  }
};

// ======================================================
// Polls
// ======================================================

export const getRoomPolls = async (roomId: string, useCache = true): Promise<Poll[]> => {
  const cacheKey = CacheKeys.roomPolls(roomId);

  if (useCache) {
    const cached = queryCache.get<Poll[]>(cacheKey);
    if (cached) return cached;
  }

  const result = await pollsApi.list(roomId);
  const data = result.data || [];

  if (useCache && data) {
    queryCache.set(cacheKey, data, 3 * 60 * 1000);
  }

  return data as Poll[];
};

export const getPollVotes = async (pollId: string, useCache = true) => {
  try {
    const cacheKey = CacheKeys.pollVotes(pollId);

    if (useCache) {
      const cached = queryCache.get<unknown[]>(cacheKey);
      if (cached) return cached;
    }

    // We need the roomId for the API call — get it from store
    // For now, iterate current polls to find it
    const { useRoomStore } = await import('../store/roomStore');
    const { currentRoom } = useRoomStore.getState();
    if (!currentRoom) return [];

    const result = await pollsApi.getVotes(currentRoom.id, pollId);
    const data = result.votes || [];

    if (useCache && data) {
      queryCache.set(cacheKey, data, 2 * 60 * 1000);
    }

    return data;
  } catch (error) {
    console.error('[API] Error fetching poll votes:', error);
    throw error;
  }
};

export const votePoll = async (pollId: string, optionIndex: number, _userId: string) => {
  try {
    const { useRoomStore } = await import('../store/roomStore');
    const { currentRoom } = useRoomStore.getState();
    if (!currentRoom) throw new Error('No current room');

    await pollsApi.vote(currentRoom.id, pollId, optionIndex);
    queryCache.invalidate(CacheKeys.pollVotes(pollId));
    return true;
  } catch (error) {
    console.error('[API] Error voting on poll:', error);
    throw error;
  }
};

export const createPoll = async (pollData: {
  room_id: string;
  title: string;
  description?: string;
  options: string[];
  created_by: string;
  expires_at?: string;
}) => {
  try {
    const data = await pollsApi.create(
      pollData.room_id,
      pollData.title,
      pollData.options,
      pollData.expires_at
    );

    if (data?.room_id) {
      queryCache.invalidate(CacheKeys.roomPolls(data.room_id));
    }

    return data;
  } catch (error) {
    console.error('[API] Error creating poll:', error);
    throw error;
  }
};

export const deleteAlert = async (alertId: string, roomId?: string) => {
  try {
    if (!roomId) throw new Error('roomId required');
    await alertsApi.delete(roomId, alertId);
    if (roomId) invalidateRoomCache(roomId);
    return true;
  } catch (error) {
    console.error('[API] Error deleting alert:', error);
    throw error;
  }
};

export const cleanupStaleMediaTracksHeartbeat = async (_roomId?: string, _hours?: number): Promise<number> => {
  return 0;
};
