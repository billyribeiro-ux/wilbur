import { describe, it, expect } from 'vitest';
import { spotifyStore } from './spotify.svelte';

describe('spotifyStore.playerState', () => {
	it('reflects the current playback state', () => {
		spotifyStore.isPlaying = true;
		spotifyStore.volume = 42;
		spotifyStore.progress = 1234;
		spotifyStore.currentTrack = null;

		expect(spotifyStore.playerState).toEqual({
			isPlaying: true,
			currentTrack: undefined,
			progress: 1234,
			volume: 42
		});
	});
});
