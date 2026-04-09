<script lang="ts">
	import { roomStore } from '$lib/stores';

	function toggleMic() { roomStore.setMicEnabled(!roomStore.isMicEnabled); }
	function toggleMute() { roomStore.setMuted(!roomStore.isMuted); }
	function handleVolume(e: Event) { roomStore.setVolume(Number((e.target as HTMLInputElement).value)); }
</script>

<div class="audio-controls">
	<button class="mic-btn" class:active={roomStore.isMicEnabled} onclick={toggleMic} title={roomStore.isMicEnabled ? 'Mute mic' : 'Unmute mic'}>
		{roomStore.isMicEnabled ? '🎙️' : '🔇'}
	</button>

	<div class="volume-group">
		<button class="mute-btn" onclick={toggleMute} title={roomStore.isMuted ? 'Unmute' : 'Mute'}>
			{roomStore.isMuted ? '🔇' : roomStore.volume > 50 ? '🔊' : '🔉'}
		</button>
		<input
			type="range"
			min="0" max="100"
			value={roomStore.volume}
			disabled={roomStore.isMuted}
			oninput={handleVolume}
			class="volume-slider"
		/>
	</div>
</div>

<style>
	.audio-controls { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: var(--surface-2, #1e1e2e); border-radius: 8px; }
	.mic-btn, .mute-btn { background: none; border: 1px solid var(--border, #444); border-radius: 8px; padding: 0.4rem 0.6rem; cursor: pointer; font-size: 1.1rem; transition: all 0.15s; }
	.mic-btn.active { background: var(--color-primary, #3b82f6); border-color: var(--color-primary, #3b82f6); }
	.volume-group { display: flex; align-items: center; gap: 0.35rem; }
	.volume-slider { width: 80px; height: 4px; accent-color: var(--color-primary, #3b82f6); cursor: pointer; }
	.volume-slider:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
