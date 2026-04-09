/**
 * Notification Store - Svelte 5 Runes
 * Wilbur Trading Room - April 2026
 */

import { browser } from '$app/environment';
import { pb, Collections, subscribeToCollection, unsubscribe } from '$lib/services/pocketbase';
import type { Notification } from '$lib/types';

class NotificationStore {
	notifications = $state<Notification[]>([]);
	unreadCount = $state(0);
	soundEnabled = $state(true);
	isOpen = $state(false);

	get hasUnread(): boolean {
		return this.unreadCount > 0;
	}

	async fetchNotifications(): Promise<void> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) return;
			const records = await pb.collection(Collections.NOTIFICATIONS).getList(1, 50, {
				filter: `user = "${userId}"`, sort: '-created'
			});
			this.notifications = records.items.map(r => ({
				id: r.id as string, userId: r.user as string,
				type: r.type as Notification['type'], title: r.title as string,
				message: r.message as string, roomId: r.roomId as string | undefined,
				alertId: r.alertId as string | undefined, link: r.link as string | undefined,
				metadata: r.metadata as Record<string, unknown> | undefined,
				createdAt: r.created as string
			}));
			this.unreadCount = this.notifications.length;
		} catch (err) {
			console.error('Failed to fetch notifications:', err);
		}
	}

	subscribe(): void {
		const userId = pb.authStore.model?.id;
		if (!userId) return;
		subscribeToCollection<Record<string, unknown>>(
			Collections.NOTIFICATIONS,
			({ action, record }) => {
				if (record.user !== userId) return;
				if (action === 'create') {
					const notif: Notification = {
						id: record.id as string, userId: record.user as string,
						type: record.type as Notification['type'], title: record.title as string,
						message: record.message as string, roomId: record.roomId as string | undefined,
						createdAt: record.created as string
					};
					this.notifications = [notif, ...this.notifications];
					this.unreadCount++;
					if (this.soundEnabled && browser) this.playSound();
				}
			},
			`user = "${userId}"`
		);
	}

	unsubscribe(): void {
		unsubscribe(Collections.NOTIFICATIONS);
	}

	markAllRead(): void {
		this.unreadCount = 0;
	}

	toggle(): void {
		this.isOpen = !this.isOpen;
		if (this.isOpen) this.markAllRead();
	}

	close(): void {
		this.isOpen = false;
	}

	toggleSound(): void {
		this.soundEnabled = !this.soundEnabled;
	}

	private playSound(): void {
		try {
			const audio = new Audio('/sounds/notification.mp3');
			audio.volume = 0.3;
			audio.play().catch(() => {});
		} catch { /* silently fail */ }
	}

	reset(): void {
		this.notifications = [];
		this.unreadCount = 0;
		this.isOpen = false;
	}
}

export const notificationStore = new NotificationStore();
