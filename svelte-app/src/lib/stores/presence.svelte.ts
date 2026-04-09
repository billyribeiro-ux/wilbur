/**
 * Presence & Typing Indicators Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

import { pb, Collections } from '$lib/services/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

export interface UserPresence {
	userId: string;
	displayName: string;
	status: 'online' | 'away' | 'offline';
	lastSeen: string;
	currentRoomId?: string;
}

export interface TypingUser {
	userId: string;
	displayName: string;
	startedAt: number;
}

// ============================================================================
// PRESENCE STATE - Svelte 5 Runes
// ============================================================================

class PresenceStore {
	// State
	onlineUsers = $state<Map<string, UserPresence>>(new Map());
	typingUsers = $state<Map<string, TypingUser>>(new Map());
	currentRoomId = $state<string | null>(null);

	private typingTimeout: ReturnType<typeof setTimeout> | null = null;
	private presenceInterval: ReturnType<typeof setInterval> | null = null;
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	// Derived
	get typingUsersList(): TypingUser[] {
		return Array.from(this.typingUsers.values());
	}

	get onlineUsersList(): UserPresence[] {
		return Array.from(this.onlineUsers.values()).filter(u => u.status !== 'offline');
	}

	get typingText(): string {
		const typing = this.typingUsersList;
		if (typing.length === 0) return '';
		if (typing.length === 1) return `${typing[0].displayName} is typing...`;
		if (typing.length === 2) return `${typing[0].displayName} and ${typing[1].displayName} are typing...`;
		return `${typing[0].displayName} and ${typing.length - 1} others are typing...`;
	}

	// ============================================================================
	// TYPING INDICATORS
	// ============================================================================

	/**
	 * Broadcast that current user is typing
	 */
	startTyping(roomId: string, userId: string, displayName: string): void {
		if (this.typingTimeout) {
			clearTimeout(this.typingTimeout);
		}

		// Broadcast via Pocketbase realtime (using a temporary record or channel)
		this.broadcastTyping(roomId, userId, displayName, true);

		// Auto-stop typing after 3 seconds of inactivity
		this.typingTimeout = setTimeout(() => {
			this.stopTyping(roomId, userId);
		}, 3000);
	}

	/**
	 * Broadcast that current user stopped typing
	 */
	stopTyping(roomId: string, userId: string): void {
		if (this.typingTimeout) {
			clearTimeout(this.typingTimeout);
			this.typingTimeout = null;
		}

		this.broadcastTyping(roomId, userId, '', false);
	}

	/**
	 * Handle incoming typing event
	 */
	handleTypingEvent(userId: string, displayName: string, isTyping: boolean): void {
		if (isTyping) {
			this.typingUsers.set(userId, {
				userId,
				displayName,
				startedAt: Date.now()
			});
		} else {
			this.typingUsers.delete(userId);
		}

		// Force reactivity update
		this.typingUsers = new Map(this.typingUsers);
	}

	private broadcastTyping(roomId: string, userId: string, displayName: string, isTyping: boolean): void {
		// In a real implementation, you'd broadcast via Pocketbase realtime
		// For now, this is a local-only implementation
		// When Pocketbase supports custom realtime events, integrate here

		// Simulated broadcast (would use WebSocket channel in production)
		if (typeof window !== 'undefined') {
			const event = new CustomEvent('wilbur:typing', {
				detail: { roomId, userId, displayName, isTyping }
			});
			window.dispatchEvent(event);
		}
	}

	// ============================================================================
	// USER PRESENCE
	// ============================================================================

	/**
	 * Join a room and start presence tracking
	 */
	joinRoom(roomId: string, userId: string, displayName: string): void {
		this.currentRoomId = roomId;

		// Set user as online
		this.onlineUsers.set(userId, {
			userId,
			displayName,
			status: 'online',
			lastSeen: new Date().toISOString(),
			currentRoomId: roomId
		});

		// Start presence heartbeat
		this.startPresenceHeartbeat(roomId, userId);

		// Start cleanup interval for stale typing indicators
		this.startCleanupInterval();

		// Listen for typing events
		if (typeof window !== 'undefined') {
			window.addEventListener('wilbur:typing', this.handleTypingEventListener);
		}
	}

	/**
	 * Leave room and stop presence tracking
	 */
	leaveRoom(userId: string): void {
		this.currentRoomId = null;
		this.onlineUsers.delete(userId);
		this.typingUsers.clear();

		if (this.presenceInterval) {
			clearInterval(this.presenceInterval);
			this.presenceInterval = null;
		}

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		if (typeof window !== 'undefined') {
			window.removeEventListener('wilbur:typing', this.handleTypingEventListener);
		}
	}

	private handleTypingEventListener = (e: Event): void => {
		const { userId, displayName, isTyping } = (e as CustomEvent).detail;
		this.handleTypingEvent(userId, displayName, isTyping);
	};

	private startPresenceHeartbeat(roomId: string, userId: string): void {
		// Update presence every 30 seconds
		this.presenceInterval = setInterval(() => {
			const user = this.onlineUsers.get(userId);
			if (user) {
				user.lastSeen = new Date().toISOString();
				this.onlineUsers = new Map(this.onlineUsers);
			}
		}, 30000);
	}

	private startCleanupInterval(): void {
		// Clean up stale typing indicators every 5 seconds
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			let hasChanges = false;

			for (const [userId, typing] of this.typingUsers.entries()) {
				// Remove typing indicators older than 5 seconds
				if (now - typing.startedAt > 5000) {
					this.typingUsers.delete(userId);
					hasChanges = true;
				}
			}

			if (hasChanges) {
				this.typingUsers = new Map(this.typingUsers);
			}
		}, 5000);
	}

	/**
	 * Update user status
	 */
	setStatus(userId: string, status: UserPresence['status']): void {
		const user = this.onlineUsers.get(userId);
		if (user) {
			user.status = status;
			user.lastSeen = new Date().toISOString();
			this.onlineUsers = new Map(this.onlineUsers);
		}
	}

	/**
	 * Handle incoming presence update
	 */
	handlePresenceUpdate(presence: UserPresence): void {
		this.onlineUsers.set(presence.userId, presence);
		this.onlineUsers = new Map(this.onlineUsers);
	}

	/**
	 * Handle user disconnect
	 */
	handleUserDisconnect(userId: string): void {
		this.onlineUsers.delete(userId);
		this.typingUsers.delete(userId);
		this.onlineUsers = new Map(this.onlineUsers);
		this.typingUsers = new Map(this.typingUsers);
	}

	/**
	 * Reset all state
	 */
	reset(): void {
		this.onlineUsers = new Map();
		this.typingUsers = new Map();
		this.currentRoomId = null;

		if (this.typingTimeout) {
			clearTimeout(this.typingTimeout);
			this.typingTimeout = null;
		}

		if (this.presenceInterval) {
			clearInterval(this.presenceInterval);
			this.presenceInterval = null;
		}

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}
}

// Export singleton instance
export const presenceStore = new PresenceStore();
