/**
 * Room Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

import { pb, Collections, subscribeToCollection, unsubscribe } from '$lib/services/pocketbase';
import type { Room, RoomWithContext, RoomMembership, ChatMessage, Alert, User, Poll, PollVote, PollWithVotes } from '$lib/types';

// ============================================================================
// ROOM STATE - Svelte 5 Runes
// ============================================================================

class RoomStore {
	// Reactive state
	rooms = $state<RoomWithContext[]>([]);
	currentRoom = $state<RoomWithContext | null>(null);
	currentRoomId = $state<string | null>(null);
	members = $state<(RoomMembership & { user: User })[]>([]);
	messages = $state<ChatMessage[]>([]);
	alerts = $state<Alert[]>([]);
	polls = $state<PollWithVotes[]>([]);
	isRecording = $state(false);
	recordingId = $state<string | undefined>(undefined);
	isMicEnabled = $state(false);
	volume = $state(100);
	isMuted = $state(false);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Derived state
	get onlineMembers() {
		return this.members.filter(m => m.user); // TODO: Add online status
	}

	get pinnedMessages() {
		return this.messages.filter(m => m.isPinned);
	}

	get recentAlerts() {
		return this.alerts.slice(0, 10);
	}

	get activePolls() {
		return this.polls.filter(p => p.isActive);
	}

	// ============================================================================
	// ROOM OPERATIONS
	// ============================================================================

	async fetchRooms(): Promise<void> {
		this.isLoading = true;
		this.error = null;

		try {
			const records = await pb.collection(Collections.ROOMS).getFullList({
				filter: 'isActive = true',
				sort: '-created',
				expand: 'createdBy'
			});

			this.rooms = records.map(r => this.mapToRoomWithContext(r));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch rooms';
		} finally {
			this.isLoading = false;
		}
	}

	async fetchRoom(roomId: string): Promise<RoomWithContext | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const record = await pb.collection(Collections.ROOMS).getOne(roomId, {
				expand: 'createdBy,tenant'
			});

			const room = this.mapToRoomWithContext(record);
			this.currentRoom = room;
			this.currentRoomId = roomId;

			// Fetch related data
			await Promise.all([
				this.fetchMembers(roomId),
				this.fetchMessages(roomId),
				this.fetchAlerts(roomId),
				this.fetchPolls(roomId)
			]);

			return room;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch room';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	async createRoom(data: { name: string; title: string; description?: string; tenantId: string; tags?: string[] }): Promise<Room | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			const record = await pb.collection(Collections.ROOMS).create({
				name: data.name,
				title: data.title,
				description: data.description || '',
				tenant: data.tenantId,
				createdBy: userId,
				isActive: true,
				tags: data.tags || []
			});

			// Also create membership for creator as admin
			await pb.collection(Collections.ROOM_MEMBERSHIPS).create({
				room: record.id,
				user: userId,
				role: 'admin'
			});

			const room = this.mapToRoomWithContext(record);
			this.rooms = [room, ...this.rooms];
			return room;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to create room';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	async joinRoom(roomId: string): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			await pb.collection(Collections.ROOM_MEMBERSHIPS).create({
				room: roomId,
				user: userId,
				role: 'member'
			});

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to join room';
			return false;
		}
	}

	async leaveRoom(roomId: string): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			const membership = await pb.collection(Collections.ROOM_MEMBERSHIPS).getFirstListItem(
				`room = "${roomId}" && user = "${userId}"`
			);

			await pb.collection(Collections.ROOM_MEMBERSHIPS).delete(membership.id);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to leave room';
			return false;
		}
	}

	// ============================================================================
	// MEMBERS
	// ============================================================================

	async fetchMembers(roomId: string): Promise<void> {
		try {
			const records = await pb.collection(Collections.ROOM_MEMBERSHIPS).getFullList({
				filter: `room = "${roomId}"`,
				expand: 'user'
			});

			this.members = records.map(r => ({
				id: r.id,
				roomId: r.room,
				userId: r.user,
				role: r.role,
				joinedAt: r.created,
				location: r.location,
				user: r.expand?.user ? {
					id: r.expand.user.id,
					email: r.expand.user.email,
					displayName: r.expand.user.displayName,
					avatarUrl: r.expand.user.avatarUrl,
					role: r.expand.user.role,
					createdAt: r.expand.user.created,
					updatedAt: r.expand.user.updated
				} : undefined
			})) as (RoomMembership & { user: User })[];
		} catch (err) {
			console.error('Failed to fetch members:', err);
		}
	}

	// ============================================================================
	// MESSAGES
	// ============================================================================

	async fetchMessages(roomId: string, limit: number = 100): Promise<void> {
		try {
			const records = await pb.collection(Collections.CHAT_MESSAGES).getList(1, limit, {
				filter: `room = "${roomId}" && isDeleted = false`,
				sort: '-created',
				expand: 'user'
			});

			this.messages = records.items.reverse().map(r => this.mapToMessage(r));
		} catch (err) {
			console.error('Failed to fetch messages:', err);
		}
	}

	async sendMessage(content: string, contentType: 'text' | 'image' | 'file' = 'text', fileUrl?: string): Promise<boolean> {
		if (!this.currentRoomId) return false;

		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			await pb.collection(Collections.CHAT_MESSAGES).create({
				room: this.currentRoomId,
				user: userId,
				content,
				contentType,
				fileUrl,
				isDeleted: false,
				isOffTopic: false,
				isPinned: false
			});

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to send message';
			return false;
		}
	}

	async deleteMessage(messageId: string): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			await pb.collection(Collections.CHAT_MESSAGES).update(messageId, {
				isDeleted: true,
				deletedBy: userId,
				deletedAt: new Date().toISOString()
			});

			this.messages = this.messages.filter(m => m.id !== messageId);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to delete message';
			return false;
		}
	}

	async pinMessage(messageId: string): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			await pb.collection(Collections.CHAT_MESSAGES).update(messageId, {
				isPinned: true,
				pinnedBy: userId,
				pinnedAt: new Date().toISOString()
			});

			this.messages = this.messages.map(m =>
				m.id === messageId ? { ...m, isPinned: true, pinnedBy: userId } : m
			);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to pin message';
			return false;
		}
	}

	// ============================================================================
	// ALERTS
	// ============================================================================

	async fetchAlerts(roomId: string, limit: number = 50): Promise<void> {
		try {
			const records = await pb.collection(Collections.ALERTS).getList(1, limit, {
				filter: `room = "${roomId}"`,
				sort: '-created',
				expand: 'author'
			});

			this.alerts = records.items.map(r => this.mapToAlert(r));
		} catch (err) {
			console.error('Failed to fetch alerts:', err);
		}
	}

	async createAlert(data: { title?: string; body: string; type?: 'text' | 'url' | 'media'; isNonTrade?: boolean; hasLegalDisclosure?: boolean; legalDisclosureText?: string }): Promise<boolean> {
		if (!this.currentRoomId) return false;

		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			await pb.collection(Collections.ALERTS).create({
				room: this.currentRoomId,
				author: userId,
				title: data.title || '',
				body: data.body,
				type: data.type || 'text',
				isNonTrade: data.isNonTrade || false,
				hasLegalDisclosure: data.hasLegalDisclosure || false,
				legalDisclosureText: data.legalDisclosureText || ''
			});

			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to create alert';
			return false;
		}
	}

	// ============================================================================
	// POLLS
	// ============================================================================

	async fetchPolls(roomId: string): Promise<void> {
		try {
			const records = await pb.collection(Collections.POLLS).getFullList({
				filter: `room = "${roomId}"`,
				sort: '-created'
			});

			const pollsWithVotes: PollWithVotes[] = [];
			for (const r of records) {
				const votes = await pb.collection(Collections.POLL_VOTES).getFullList({
					filter: `poll = "${r.id}"`
				});
				const voteCounts = new Array((r.options as string[]).length).fill(0);
				for (const v of votes) voteCounts[v.optionIndex as number]++;
				const userId = pb.authStore.model?.id;
				const userVote = votes.find(v => v.userId === userId);
				pollsWithVotes.push({
					...this.mapToPoll(r),
					votes: votes.map(v => ({ id: v.id, pollId: v.poll as string, userId: v.userId as string, optionIndex: v.optionIndex as number, createdAt: v.created as string })),
					voteCounts,
					totalVotes: votes.length,
					userVote: userVote ? (userVote.optionIndex as number) : undefined
				});
			}
			this.polls = pollsWithVotes;
		} catch (err) {
			console.error('Failed to fetch polls:', err);
		}
	}

	async createPoll(data: { title: string; description?: string; options: string[]; expiresAt?: string }): Promise<boolean> {
		if (!this.currentRoomId) return false;
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');
			await pb.collection(Collections.POLLS).create({
				room: this.currentRoomId, createdBy: userId,
				title: data.title, description: data.description || '',
				options: data.options, isActive: true, expiresAt: data.expiresAt || ''
			});
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to create poll';
			return false;
		}
	}

	async votePoll(pollId: string, optionIndex: number): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');
			await pb.collection(Collections.POLL_VOTES).create({ poll: pollId, userId, optionIndex });
			if (this.currentRoomId) await this.fetchPolls(this.currentRoomId);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to vote';
			return false;
		}
	}

	async closePoll(pollId: string): Promise<boolean> {
		try {
			await pb.collection(Collections.POLLS).update(pollId, { isActive: false });
			this.polls = this.polls.map(p => p.id === pollId ? { ...p, isActive: false } : p);
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to close poll';
			return false;
		}
	}

	// ============================================================================
	// RECORDING & MEDIA
	// ============================================================================

	setRecording(recording: boolean, id?: string): void {
		this.isRecording = recording;
		this.recordingId = id;
	}

	setMicEnabled(enabled: boolean): void {
		this.isMicEnabled = enabled;
	}

	setVolume(vol: number): void {
		this.volume = Math.max(0, Math.min(100, vol));
	}

	setMuted(muted: boolean): void {
		this.isMuted = muted;
	}

	// ============================================================================
	// REALTIME SUBSCRIPTIONS
	// ============================================================================

	subscribeToRoom(roomId: string): void {
		// Subscribe to messages
		subscribeToCollection<Record<string, unknown>>(
			Collections.CHAT_MESSAGES,
			({ action, record }) => {
				if (record.room !== roomId) return;

				const message = this.mapToMessage(record);

				if (action === 'create') {
					this.messages = [...this.messages, message];
				} else if (action === 'update') {
					this.messages = this.messages.map(m => m.id === message.id ? message : m);
				} else if (action === 'delete') {
					this.messages = this.messages.filter(m => m.id !== message.id);
				}
			},
			`room = "${roomId}"`
		);

		// Subscribe to alerts
		subscribeToCollection<Record<string, unknown>>(
			Collections.ALERTS,
			({ action, record }) => {
				if (record.room !== roomId) return;

				const alert = this.mapToAlert(record);

				if (action === 'create') {
					this.alerts = [alert, ...this.alerts];
				} else if (action === 'update') {
					this.alerts = this.alerts.map(a => a.id === alert.id ? alert : a);
				} else if (action === 'delete') {
					this.alerts = this.alerts.filter(a => a.id !== alert.id);
				}
			},
			`room = "${roomId}"`
		);

		// Subscribe to memberships
		subscribeToCollection<Record<string, unknown>>(
			Collections.ROOM_MEMBERSHIPS,
			({ action, record }) => {
				if (record.room !== roomId) return;

				if (action === 'create' || action === 'update') {
					this.fetchMembers(roomId);
				} else if (action === 'delete') {
					this.members = this.members.filter(m => m.id !== record.id);
				}
			},
			`room = "${roomId}"`
		);
	}

	unsubscribeFromRoom(): void {
		unsubscribe(Collections.CHAT_MESSAGES);
		unsubscribe(Collections.ALERTS);
		unsubscribe(Collections.ROOM_MEMBERSHIPS);
	}

	// ============================================================================
	// HELPERS
	// ============================================================================

	private mapToRoomWithContext(record: Record<string, unknown>): RoomWithContext {
		return {
			id: record.id as string,
			name: record.name as string,
			title: record.title as string,
			description: record.description as string | undefined,
			tenantId: record.tenant as string,
			createdBy: record.createdBy as string,
			isActive: record.isActive as boolean,
			tags: record.tags as string[] | undefined,
			iconUrl: record.iconUrl as string | undefined,
			branding: record.branding as RoomWithContext['branding'],
			createdAt: record.created as string,
			updatedAt: record.updated as string,
			memberCount: 0,
			onlineCount: 0
		};
	}

	private mapToMessage(record: Record<string, unknown>): ChatMessage {
		return {
			id: record.id as string,
			roomId: record.room as string,
			userId: record.user as string,
			content: record.content as string,
			contentType: (record.contentType as ChatMessage['contentType']) || 'text',
			fileUrl: record.fileUrl as string | undefined,
			isDeleted: record.isDeleted as boolean,
			isOffTopic: record.isOffTopic as boolean,
			isPinned: record.isPinned as boolean,
			pinnedBy: record.pinnedBy as string | undefined,
			pinnedAt: record.pinnedAt as string | undefined,
			deletedBy: record.deletedBy as string | undefined,
			deletedAt: record.deletedAt as string | undefined,
			createdAt: record.created as string,
			user: (record.expand as Record<string, Record<string, unknown>> | undefined)?.user ? {
				id: (record.expand as Record<string, Record<string, unknown>>).user.id as string,
				email: (record.expand as Record<string, Record<string, unknown>>).user.email as string,
				displayName: (record.expand as Record<string, Record<string, unknown>>).user.displayName as string,
				avatarUrl: (record.expand as Record<string, Record<string, unknown>>).user.avatarUrl as string | undefined,
				role: (record.expand as Record<string, Record<string, unknown>>).user.role as User['role'],
				createdAt: (record.expand as Record<string, Record<string, unknown>>).user.created as string,
				updatedAt: (record.expand as Record<string, Record<string, unknown>>).user.updated as string
			} : undefined
		};
	}

	private mapToPoll(record: Record<string, unknown>): Poll {
		return {
			id: record.id as string,
			roomId: record.room as string,
			createdBy: record.createdBy as string,
			title: record.title as string,
			description: record.description as string | undefined,
			options: record.options as string[],
			isActive: record.isActive as boolean,
			expiresAt: record.expiresAt as string | undefined,
			createdAt: record.created as string,
			updatedAt: record.updated as string
		};
	}

	private mapToAlert(record: Record<string, unknown>): Alert {
		return {
			id: record.id as string,
			roomId: record.room as string,
			authorId: record.author as string,
			title: record.title as string | undefined,
			body: record.body as string | undefined,
			type: record.type as Alert['type'],
			isNonTrade: record.isNonTrade as boolean,
			hasLegalDisclosure: record.hasLegalDisclosure as boolean,
			legalDisclosureText: record.legalDisclosureText as string | undefined,
			createdAt: record.created as string,
			author: (record.expand as Record<string, Record<string, unknown>> | undefined)?.author ? {
				id: (record.expand as Record<string, Record<string, unknown>>).author.id as string,
				email: (record.expand as Record<string, Record<string, unknown>>).author.email as string,
				displayName: (record.expand as Record<string, Record<string, unknown>>).author.displayName as string,
				avatarUrl: (record.expand as Record<string, Record<string, unknown>>).author.avatarUrl as string | undefined,
				role: (record.expand as Record<string, Record<string, unknown>>).author.role as User['role'],
				createdAt: (record.expand as Record<string, Record<string, unknown>>).author.created as string,
				updatedAt: (record.expand as Record<string, Record<string, unknown>>).author.updated as string
			} : undefined
		};
	}

	clearError() {
		this.error = null;
	}

	reset() {
		this.currentRoom = null;
		this.currentRoomId = null;
		this.members = [];
		this.messages = [];
		this.alerts = [];
		this.polls = [];
		this.isRecording = false;
		this.recordingId = undefined;
		this.isMicEnabled = false;
		this.volume = 100;
		this.isMuted = false;
		this.error = null;
	}
}

// Export singleton instance
export const roomStore = new RoomStore();
