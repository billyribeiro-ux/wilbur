/**
 * Presence & Typing Indicators Store - Svelte 5 Runes
 * Wilbur Trading Room
 */

import { SvelteMap } from 'svelte/reactivity';

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
	// SvelteMap is reactive on set/delete/clear — no manual reassignment needed.
	onlineUsers = new SvelteMap<string, UserPresence>();
	typingUsers = new SvelteMap<string, TypingUser>();
	currentRoomId = $state<string | null>(null);

	private typingTimeout: ReturnType<typeof setTimeout> | null = null;
	private presenceInterval: ReturnType<typeof setInterval> | null = null;
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	// Derived
	get typingUsersList(): TypingUser[] {
		return Array.from(this.typingUsers.values());
	}

	get onlineUsersList(): UserPresence[] {
		return Array.from(this.onlineUsers.values()).filter((u) => u.status !== 'offline');
	}

	get typingText(): string {
		const typing = this.typingUsersList;
		if (typing.length === 0) return '';
		if (typing.length === 1) return `${typing[0].displayName} is typing...`;
		if (typing.length === 2)
			return `${typing[0].displayName} and ${typing[1].displayName} are typing...`;
		return `${typing[0].displayName} and ${typing.length - 1} others are typing...`;
	}

	// ============================================================================
	// TYPING INDICATORS
	// ============================================================================

	/** Broadcast that the current user is typing. */
	startTyping(roomId: string, userId: string, displayName: string): void {
		if (this.typingTimeout) clearTimeout(this.typingTimeout);

		this.broadcastTyping(roomId, userId, displayName, true);

		// Auto-stop typing after 3 seconds of inactivity
		this.typingTimeout = setTimeout(() => {
			this.stopTyping(roomId, userId);
		}, 3000);
	}

	/** Broadcast that the current user stopped typing. */
	stopTyping(roomId: string, userId: string): void {
		if (this.typingTimeout) {
			clearTimeout(this.typingTimeout);
			this.typingTimeout = null;
		}
		this.broadcastTyping(roomId, userId, '', false);
	}

	/** Handle an incoming typing event. */
	handleTypingEvent(userId: string, displayName: string, isTyping: boolean): void {
		if (isTyping) {
			this.typingUsers.set(userId, { userId, displayName, startedAt: Date.now() });
		} else {
			this.typingUsers.delete(userId);
		}
	}

	private broadcastTyping(roomId: string, userId: string, displayName: string, isTyping: boolean): void {
		// Local-only for now (no PocketBase realtime channel yet). When the backend
		// supports custom realtime events, broadcast here instead of a window event.
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

	/** Join a room and start presence tracking. */
	joinRoom(roomId: string, userId: string, displayName: string): void {
		this.currentRoomId = roomId;

		this.onlineUsers.set(userId, {
			userId,
			displayName,
			status: 'online',
			lastSeen: new Date().toISOString(),
			currentRoomId: roomId
		});

		this.startPresenceHeartbeat(userId);
		this.startCleanupInterval();

		if (typeof window !== 'undefined') {
			window.addEventListener('wilbur:typing', this.handleTypingEventListener);
		}
	}

	/** Leave the room and stop presence tracking. */
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

	private startPresenceHeartbeat(userId: string): void {
		this.presenceInterval = setInterval(() => {
			const user = this.onlineUsers.get(userId);
			if (user) {
				this.onlineUsers.set(userId, { ...user, lastSeen: new Date().toISOString() });
			}
		}, 30000);
	}

	private startCleanupInterval(): void {
		// Drop typing indicators older than 5 seconds.
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			for (const [userId, typing] of this.typingUsers.entries()) {
				if (now - typing.startedAt > 5000) this.typingUsers.delete(userId);
			}
		}, 5000);
	}

	/** Update a user's status. */
	setStatus(userId: string, status: UserPresence['status']): void {
		const user = this.onlineUsers.get(userId);
		if (user) {
			this.onlineUsers.set(userId, { ...user, status, lastSeen: new Date().toISOString() });
		}
	}

	/** Handle an incoming presence update. */
	handlePresenceUpdate(presence: UserPresence): void {
		this.onlineUsers.set(presence.userId, presence);
	}

	/** Handle a user disconnect. */
	handleUserDisconnect(userId: string): void {
		this.onlineUsers.delete(userId);
		this.typingUsers.delete(userId);
	}

	/** Reset all state. */
	reset(): void {
		this.onlineUsers.clear();
		this.typingUsers.clear();
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
