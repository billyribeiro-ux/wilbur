/**
 * Spotify Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

import { pb, Collections } from '$lib/services/pocketbase';
import type { SpotifyTrack, SpotifyPlayer, UserIntegration } from '$lib/types';

// ============================================================================
// SPOTIFY STATE - Svelte 5 Runes
// ============================================================================

class SpotifyStore {
	// State
	isConnected = $state(false);
	isPlaying = $state(false);
	currentTrack = $state<SpotifyTrack | null>(null);
	progress = $state(0);
	volume = $state(50);
	integration = $state<UserIntegration | null>(null);
	error = $state<string | null>(null);
	isLoading = $state(false);

	// Player state
	get playerState(): SpotifyPlayer {
		return {
			isPlaying: this.isPlaying,
			currentTrack: this.currentTrack ?? undefined,
			progress: this.progress,
			volume: this.volume
		};
	}

	// ============================================================================
	// CONNECTION
	// ============================================================================

	async checkConnection(): Promise<boolean> {
		try {
			const userId = pb.authStore.model?.id;
			if (!userId) return false;

			const integration = await pb.collection(Collections.USER_INTEGRATIONS).getFirstListItem(
				`user = "${userId}" && type = "spotify" && isActive = true`
			).catch(() => null);

			if (integration) {
				this.integration = {
					id: integration.id,
					type: 'spotify',
					accessToken: integration.accessToken,
					refreshToken: integration.refreshToken,
					expiresAt: integration.expiresAt,
					metadata: integration.metadata,
					isActive: integration.isActive
				};
				this.isConnected = true;
				return true;
			}

			this.isConnected = false;
			return false;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to check Spotify connection';
			return false;
		}
	}

	async connect(): Promise<void> {
		this.isLoading = true;
		try {
			// Redirect to Spotify OAuth
			const redirectUri = `${window.location.origin}/api/spotify/callback`;
			const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

			const scope = [
				'user-read-playback-state',
				'user-modify-playback-state',
				'user-read-currently-playing',
				'streaming',
				'user-library-read'
			].join(' ');

			const state = crypto.randomUUID();
			sessionStorage.setItem('spotify_auth_state', state);

			const params = new URLSearchParams({
				client_id: clientId,
				response_type: 'code',
				redirect_uri: redirectUri,
				scope,
				state
			});

			window.location.href = `https://accounts.spotify.com/authorize?${params}`;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to connect to Spotify';
		} finally {
			this.isLoading = false;
		}
	}

	async disconnect(): Promise<void> {
		try {
			if (this.integration) {
				await pb.collection(Collections.USER_INTEGRATIONS).update(this.integration.id, {
					isActive: false
				});
			}

			this.isConnected = false;
			this.integration = null;
			this.currentTrack = null;
			this.isPlaying = false;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to disconnect from Spotify';
		}
	}

	// ============================================================================
	// PLAYBACK CONTROL
	// ============================================================================

	async play(): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/play', {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});
			this.isPlaying = true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to play';
		}
	}

	async pause(): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/pause', {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});
			this.isPlaying = false;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to pause';
		}
	}

	async skip(): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/next', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to skip';
		}
	}

	async previous(): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			await fetch('https://api.spotify.com/v1/me/player/previous', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to go to previous';
		}
	}

	async setVolume(volume: number): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});
			this.volume = volume;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to set volume';
		}
	}

	// ============================================================================
	// PLAYBACK STATE
	// ============================================================================

	async fetchCurrentPlayback(): Promise<void> {
		if (!this.integration?.accessToken) return;

		try {
			const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
				headers: {
					'Authorization': `Bearer ${this.integration.accessToken}`
				}
			});

			if (response.status === 204) {
				this.currentTrack = null;
				this.isPlaying = false;
				return;
			}

			const data = await response.json();

			if (data.item) {
				this.currentTrack = {
					id: data.item.id,
					name: data.item.name,
					artists: data.item.artists,
					album: data.item.album,
					duration_ms: data.item.duration_ms,
					uri: data.item.uri
				};
				this.isPlaying = data.is_playing;
				this.progress = data.progress_ms;
			}
		} catch (err) {
			console.error('Failed to fetch playback:', err);
		}
	}

	startPolling(interval: number = 5000): () => void {
		const timer = setInterval(() => {
			this.fetchCurrentPlayback();
		}, interval);

		// Initial fetch
		this.fetchCurrentPlayback();

		return () => clearInterval(timer);
	}

	clearError() {
		this.error = null;
	}
}

// Export singleton instance
export const spotifyStore = new SpotifyStore();
