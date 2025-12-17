/**
 * Pocketbase Client Configuration
 * Wilbur Trading Room - December 2025
 */

import PocketBase from 'pocketbase';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

// ============================================================================
// POCKETBASE CLIENT SINGLETON
// ============================================================================

const POCKETBASE_URL = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

function createPocketBaseClient(): PocketBase {
	const pb = new PocketBase(POCKETBASE_URL);

	// Auto-cancel duplicate pending requests
	pb.autoCancellation(false);

	// Load auth from cookie if in browser
	if (browser) {
		// Auth store will automatically persist to localStorage
		pb.authStore.onChange(() => {
			// Sync auth state changes
			document.cookie = pb.authStore.exportToCookie({ httpOnly: false, secure: true });
		});
	}

	return pb;
}

// Export singleton instance
export const pb = createPocketBaseClient();

// ============================================================================
// AUTH HELPERS
// ============================================================================

export async function login(email: string, password: string) {
	return await pb.collection('users').authWithPassword(email, password);
}

export async function register(email: string, password: string, passwordConfirm: string, displayName: string) {
	// Create user
	const user = await pb.collection('users').create({
		email,
		password,
		passwordConfirm,
		displayName,
		role: 'member'
	});

	// Auto login after registration
	await login(email, password);

	return user;
}

export async function logout() {
	pb.authStore.clear();
}

export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

export function getCurrentUser() {
	return pb.authStore.model;
}

// ============================================================================
// OAUTH HELPERS
// ============================================================================

export async function loginWithOAuth(provider: 'google' | 'github' | 'spotify' | 'discord') {
	return await pb.collection('users').authWithOAuth2({ provider });
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

export async function refreshAuth() {
	if (pb.authStore.isValid) {
		try {
			await pb.collection('users').authRefresh();
			return true;
		} catch {
			pb.authStore.clear();
			return false;
		}
	}
	return false;
}

// ============================================================================
// FILE URL HELPER
// ============================================================================

export function getFileUrl(collectionId: string, recordId: string, filename: string, thumb?: string): string {
	return pb.files.getURL({ collectionId, id: recordId }, filename, { thumb });
}

// ============================================================================
// REALTIME SUBSCRIPTION HELPERS
// ============================================================================

type SubscribeCallback<T> = (data: { action: string; record: T }) => void;

export function subscribeToCollection<T>(
	collection: string,
	callback: SubscribeCallback<T>,
	filter?: string
) {
	return pb.collection(collection).subscribe('*', callback, { filter });
}

export function subscribeToRecord<T>(
	collection: string,
	recordId: string,
	callback: SubscribeCallback<T>
) {
	return pb.collection(collection).subscribe(recordId, callback);
}

export function unsubscribe(collection: string) {
	pb.collection(collection).unsubscribe();
}

export function unsubscribeAll() {
	pb.realtime.unsubscribe();
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface PocketBaseError {
	code: number;
	message: string;
	data: Record<string, { code: string; message: string }>;
}

export function formatPocketBaseError(error: unknown): string {
	const pbError = error as PocketBaseError;

	if (pbError.data && Object.keys(pbError.data).length > 0) {
		const fieldErrors = Object.entries(pbError.data)
			.map(([field, err]) => `${field}: ${err.message}`)
			.join(', ');
		return fieldErrors;
	}

	if (pbError.message) {
		return pbError.message;
	}

	return 'An unknown error occurred';
}

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const Collections = {
	USERS: 'users',
	ROOMS: 'rooms',
	ROOM_MEMBERSHIPS: 'room_memberships',
	CHAT_MESSAGES: 'chat_messages',
	ALERTS: 'alerts',
	POLLS: 'polls',
	POLL_VOTES: 'poll_votes',
	NOTIFICATIONS: 'notifications',
	PRIVATE_CHATS: 'private_chats',
	PRIVATE_MESSAGES: 'private_messages',
	MODERATION_LOGS: 'moderation_logs',
	BANNED_USERS: 'banned_users',
	REPORTED_CONTENT: 'reported_content',
	USER_INTEGRATIONS: 'user_integrations',
	TENANTS: 'tenants',
	ROOM_FILES: 'room_files'
} as const;

export default pb;
