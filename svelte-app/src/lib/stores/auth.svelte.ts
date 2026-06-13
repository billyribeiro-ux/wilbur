/**
 * Authentication Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

import { pb, login as pbLogin, register as pbRegister, logout as pbLogout, refreshAuth } from '$lib/services/pocketbase';
import { mapUser } from '$lib/services/mappers';
import type { User } from '$lib/types';

// ============================================================================
// AUTH STATE - Svelte 5 Runes
// ============================================================================

class AuthStore {
	// Reactive state using $state rune
	user = $state<User | null>(null);
	isLoading = $state(true);
	isAuthenticated = $state(false);
	error = $state<string | null>(null);

	/** True for admins and hosts. Single source of truth for the role rules. */
	get isAdmin(): boolean {
		return this.user?.role === 'admin' || this.user?.role === 'host';
	}

	/** True for anyone who can moderate (admin, host, or moderator). */
	get canModerate(): boolean {
		return this.isAdmin || this.user?.role === 'moderator';
	}

	constructor() {
		// Initialize from PocketBase auth store
		this.initializeFromAuthStore();
	}

	private initializeFromAuthStore() {
		if (pb.authStore.isValid && pb.authStore.model) {
			this.user = mapUser(pb.authStore.model);
			this.isAuthenticated = true;
		}
		this.isLoading = false;

		// Listen for auth changes
		pb.authStore.onChange((token, model) => {
			if (token && model) {
				this.user = mapUser(model);
				this.isAuthenticated = true;
			} else {
				this.user = null;
				this.isAuthenticated = false;
			}
		});
	}

	async login(email: string, password: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const authData = await pbLogin(email, password);
			this.user = mapUser(authData.record);
			this.isAuthenticated = true;
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Login failed';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async register(email: string, password: string, passwordConfirm: string, displayName: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			await pbRegister(email, password, passwordConfirm, displayName);
			// pbRegister auto-logs in
			if (pb.authStore.model) {
				this.user = mapUser(pb.authStore.model);
				this.isAuthenticated = true;
			}
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Registration failed';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async logout(): Promise<void> {
		await pbLogout();
		this.user = null;
		this.isAuthenticated = false;
		this.error = null;
	}

	async refresh(): Promise<boolean> {
		this.isLoading = true;
		try {
			const success = await refreshAuth();
			if (success && pb.authStore.model) {
				this.user = mapUser(pb.authStore.model);
				this.isAuthenticated = true;
			} else {
				this.user = null;
				this.isAuthenticated = false;
			}
			return success;
		} finally {
			this.isLoading = false;
		}
	}

	clearError() {
		this.error = null;
	}
}

// Export singleton instance
export const authStore = new AuthStore();

// Convenience exports
export const getCurrentUser = () => authStore.user;
export const isAuthenticated = () => authStore.isAuthenticated;
