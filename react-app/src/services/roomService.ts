// Room service using roomsApi
import { roomsApi } from '../api/rooms';
import type { Room } from '../types/database.types';

import { reportError, ErrorSeverity } from './authService';

// Type definitions for room operations
export interface InsertRoom {
  tenant_id: string;
  name: string;
  title: string;
  description?: string;
  icon_url?: string;
  is_active?: boolean;
  created_by: string;
  card_bg_color?: string;
  card_border_color?: string;
  icon_bg_color?: string;
  icon_color?: string;
  title_color?: string;
  description_color?: string;
  button_text?: string;
  button_bg_color?: string;
  button_text_color?: string;
  button_width?: string;
}

export interface RoomResponse {
  data: Room | undefined;
  error: Error | undefined;
}

export interface RoomsResponse {
  data: Room[] | undefined;
  error: Error | undefined;
}

// Retry utility for transient failures
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Operation failed');

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

class RoomService {
  // Create room with retry logic and error reporting
  async createRoom(roomData: InsertRoom): Promise<RoomResponse> {
    try {
      const data = await retryOperation(async () => {
        return await roomsApi.create({
          name: roomData.name,
          title: roomData.title,
          description: roomData.description,
          tenant_id: roomData.tenant_id,
        });
      });

      return { data: data as unknown as Room, error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.HIGH, {
        component: 'RoomService',
        action: 'createRoom',
        metadata: { roomName: roomData.name, tenantId: roomData.tenant_id }
      });
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error('Failed to create room'),
      };
    }
  }

  // Get rooms by tenant with error handling
  async getRoomsByTenant(tenantId: string): Promise<RoomsResponse> {
    try {
      const data = await retryOperation(async () => {
        return await roomsApi.listByTenant(tenantId);
      });

      return { data: data as unknown as Room[], error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'RoomService',
        action: 'getRoomsByTenant',
        metadata: { tenantId }
      });
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error('Failed to get rooms'),
      };
    }
  }

  // Get room by ID with error handling
  async getRoomById(roomId: string): Promise<RoomResponse> {
    try {
      const data = await retryOperation(async () => {
        return await roomsApi.get(roomId);
      });

      return { data: data as unknown as Room, error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'RoomService',
        action: 'getRoomById',
        metadata: { roomId }
      });
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error('Failed to get room'),
      };
    }
  }

  // Update room with error handling
  async updateRoom(roomId: string, updates: Partial<InsertRoom>): Promise<RoomResponse> {
    try {
      const data = await retryOperation(async () => {
        return await roomsApi.update(roomId, updates);
      });

      return { data: data as unknown as Room, error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'RoomService',
        action: 'updateRoom',
        metadata: { roomId }
      });
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error('Failed to update room'),
      };
    }
  }

  // Delete room with error handling
  async deleteRoom(roomId: string): Promise<{ error?: Error }> {
    try {
      await retryOperation(async () => {
        return await roomsApi.delete(roomId);
      });

      return { error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.HIGH, {
        component: 'RoomService',
        action: 'deleteRoom',
        metadata: { roomId }
      });
      return {
        error: error instanceof Error ? error : new Error('Failed to delete room'),
      };
    }
  }

  // Add user to room membership
  async addRoomMember(roomId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<{ error?: Error }> {
    try {
      await retryOperation(async () => {
        return await roomsApi.invite(roomId, userId, role);
      });

      return { error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'RoomService',
        action: 'addRoomMember',
        metadata: { roomId, userId, role }
      });
      return {
        error: error instanceof Error ? error : new Error('Failed to add room member'),
      };
    }
  }

  // Remove user from room membership
  async removeRoomMember(roomId: string, userId: string): Promise<{ error?: Error }> {
    try {
      await retryOperation(async () => {
        return await roomsApi.removeMember(roomId, userId);
      });

      return { error: undefined };
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), ErrorSeverity.MEDIUM, {
        component: 'RoomService',
        action: 'removeRoomMember',
        metadata: { roomId, userId }
      });
      return {
        error: error instanceof Error ? error : new Error('Failed to remove room member'),
      };
    }
  }
}

// Export singleton instance
export const roomService = new RoomService();
export default roomService;
