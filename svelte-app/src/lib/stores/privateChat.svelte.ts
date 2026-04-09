/**
 * Private Chat Store - Svelte 5 Runes
 * Wilbur Trading Room - April 2026
 */

import { pb, Collections, subscribeToCollection, unsubscribe } from '$lib/services/pocketbase';
import type { PrivateChat, PrivateMessage, User } from '$lib/types';

class PrivateChatStore {
	chats = $state<PrivateChat[]>([]);
	activeChat = $state<PrivateChat | null>(null);
	messages = $state<PrivateMessage[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);

	get unreadCount(): number {
		return 0; // TODO: Implement unread tracking
	}

	async fetchChats(): Promise<void> {
		this.isLoading = true;
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');
			const records = await pb.collection(Collections.PRIVATE_CHATS).getFullList({
				filter: `user1 = "${userId}" || user2 = "${userId}"`,
				sort: '-updated',
				expand: 'user1,user2'
			});
			this.chats = records.map(r => this.mapToChat(r, userId));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch chats';
		} finally {
			this.isLoading = false;
		}
	}

	async openChat(otherUserId: string): Promise<PrivateChat | null> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');

			// Check if chat already exists
			const existing = this.chats.find(
				c => c.user1Id === otherUserId || c.user2Id === otherUserId
			);
			if (existing) {
				this.activeChat = existing;
				await this.fetchMessages(existing.id);
				return existing;
			}

			// Create new chat
			const record = await pb.collection(Collections.PRIVATE_CHATS).create({
				user1: userId, user2: otherUserId
			});
			const chat = this.mapToChat(record, userId);
			this.chats = [chat, ...this.chats];
			this.activeChat = chat;
			this.messages = [];
			return chat;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to open chat';
			return null;
		}
	}

	async fetchMessages(chatId: string, limit = 100): Promise<void> {
		try {
			const records = await pb.collection(Collections.PRIVATE_MESSAGES).getList(1, limit, {
				filter: `chat = "${chatId}"`, sort: '-created', expand: 'sender'
			});
			this.messages = records.items.reverse().map(r => ({
				id: r.id, chatId: r.chat as string, senderId: r.sender as string,
				content: r.content as string, createdAt: r.created as string,
				sender: r.expand?.sender ? this.mapUser(r.expand.sender as Record<string, unknown>) : undefined
			}));
		} catch (err) {
			console.error('Failed to fetch private messages:', err);
		}
	}

	async sendMessage(content: string): Promise<boolean> {
		if (!this.activeChat) return false;
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) throw new Error('Not authenticated');
			await pb.collection(Collections.PRIVATE_MESSAGES).create({
				chat: this.activeChat.id, sender: userId, content
			});
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to send message';
			return false;
		}
	}

	subscribeToChat(chatId: string): void {
		subscribeToCollection<Record<string, unknown>>(
			Collections.PRIVATE_MESSAGES,
			({ action, record }) => {
				if (record.chat !== chatId) return;
				const msg: PrivateMessage = {
					id: record.id as string, chatId: record.chat as string,
					senderId: record.sender as string, content: record.content as string,
					createdAt: record.created as string
				};
				if (action === 'create') this.messages = [...this.messages, msg];
			},
			`chat = "${chatId}"`
		);
	}

	unsubscribeFromChat(): void { unsubscribe(Collections.PRIVATE_MESSAGES); }

	private mapToChat(r: Record<string, unknown>, currentUserId: string): PrivateChat {
		const isUser1 = r.user1 === currentUserId;
		const expand = r.expand as { user1?: Record<string, unknown>; user2?: Record<string, unknown> } | undefined;
		const otherUserData = isUser1 ? expand?.user2 : expand?.user1;
		return {
			id: r.id as string, user1Id: r.user1 as string, user2Id: r.user2 as string,
			createdAt: r.created as string, updatedAt: r.updated as string,
			otherUser: otherUserData ? this.mapUser(otherUserData) : undefined
		};
	}

	private mapUser(u: Record<string, unknown>): User {
		return {
			id: u.id as string, email: u.email as string, displayName: u.displayName as string,
			avatarUrl: u.avatarUrl as string | undefined, role: u.role as User['role'],
			createdAt: u.created as string, updatedAt: u.updated as string
		};
	}

	closeChat(): void { this.activeChat = null; this.messages = []; }

	reset(): void {
		this.chats = []; this.activeChat = null; this.messages = [];
		this.error = null; this.isLoading = false;
	}
}

export const privateChatStore = new PrivateChatStore();
