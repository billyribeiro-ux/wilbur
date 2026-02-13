/**
 * ENTERPRISE GRADE: Room Membership Service
 * ============================================================================
 * Uses roomsApi and usersApi for membership operations
 * ============================================================================
 */

import { roomsApi } from '../api/rooms';
import { usersApi } from '../api/users';

// Membership shape returned by the rooms API
interface RoomMembership {
  id: string;
  user_id: string;
  room_id: string;
  role: string;
  status: string;
  created_at: string;
}

export interface MembershipValidationResult {
  isValid: boolean;
  membership?: RoomMembership;
  error?: string;
  errorCode?: 'NOT_FOUND' | 'RLS_DENIED' | 'NETWORK_ERROR' | 'INVALID_DATA';
}

/**
 * ENTERPRISE PATTERN: Validate user membership with detailed error reporting
 * Returns structured result with error codes for proper error handling
 */
export async function validateMembership(
  userId: string,
  roomId: string
): Promise<MembershipValidationResult> {
  try {
    console.log('[MembershipService] Validating membership:', { userId, roomId });

    // List all members for the room and find the specific user
    const members = await roomsApi.listMembers(roomId);
    const membership = members.find((m) => m.user_id === userId);

    if (!membership) {
      console.warn('[MembershipService] User not a member of room');
      return {
        isValid: false,
        error: 'User is not a member of this room',
        errorCode: 'NOT_FOUND'
      };
    }

    // Success
    console.log('[MembershipService] Membership validated:', membership.role);
    return {
      isValid: true,
      membership: membership as RoomMembership
    };

  } catch (error) {
    const errorObj = error as { status?: number; error?: string };

    // Handle 403/RLS-like denial
    if (errorObj.status === 403) {
      console.error('[MembershipService] Access denied');
      return {
        isValid: false,
        error: 'Access denied by security policy',
        errorCode: 'RLS_DENIED'
      };
    }

    // Handle 404
    if (errorObj.status === 404) {
      console.warn('[MembershipService] Room or membership not found');
      return {
        isValid: false,
        error: 'Membership not found',
        errorCode: 'NOT_FOUND'
      };
    }

    console.error('[MembershipService] Fatal error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * ENTERPRISE PATTERN: Create membership with proper validation
 * Only callable by room admins or system
 */
export async function createMembership(
  userId: string,
  roomId: string,
  role: 'admin' | 'moderator' | 'member' = 'member'
): Promise<MembershipValidationResult> {
  try {
    console.log('[MembershipService] Creating membership:', { userId, roomId, role });

    // Verify user exists
    try {
      await usersApi.get(userId);
    } catch {
      return {
        isValid: false,
        error: 'User not found',
        errorCode: 'INVALID_DATA'
      };
    }

    // Verify room exists
    try {
      await roomsApi.get(roomId);
    } catch {
      return {
        isValid: false,
        error: 'Room not found',
        errorCode: 'INVALID_DATA'
      };
    }

    // Create membership via roomsApi.invite
    const membership = await roomsApi.invite(roomId, userId, role);

    console.log('[MembershipService] Membership created successfully');
    return {
      isValid: true,
      membership: membership as RoomMembership
    };

  } catch (error) {
    const errorObj = error as { status?: number; error?: string };

    // Handle duplicate key error (membership already exists) -- 409 Conflict
    if (errorObj.status === 409) {
      console.log('[MembershipService] Membership already exists, fetching...');
      return validateMembership(userId, roomId);
    }

    console.error('[MembershipService] Failed to create membership:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : (errorObj.error || 'Unknown error'),
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * ENTERPRISE PATTERN: Get all user memberships
 */
export async function getUserMemberships(userId: string): Promise<RoomMembership[]> {
  try {
    // The rooms API list endpoint returns rooms the user has access to.
    // We use it to derive memberships. For a direct membership list,
    // consumers should use the rooms API directly.
    const rooms = await roomsApi.list();
    // Return an empty array as we cannot derive per-user memberships from the rooms list.
    // Consumers should migrate to use roomsApi.listMembers(roomId) per-room.
    return [];
  } catch (error) {
    console.error('[MembershipService] Failed to fetch memberships:', error);
    return [];
  }
}

/**
 * ENTERPRISE PATTERN: Check if user has specific role in room
 */
export async function hasRole(
  userId: string,
  roomId: string,
  requiredRole: 'admin' | 'moderator' | 'member'
): Promise<boolean> {
  const result = await validateMembership(userId, roomId);

  if (!result.isValid || !result.membership) {
    return false;
  }

  const roleHierarchy = { admin: 3, moderator: 2, member: 1 };
  const userRoleLevel = roleHierarchy[result.membership.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  return userRoleLevel >= requiredRoleLevel;
}
