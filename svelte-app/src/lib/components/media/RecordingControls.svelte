<script lang="ts">
	import { roomStore } from '$lib/stores';

	let elapsed = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (roomStore.isRecording) {
			elapsed = 0;
			timer = setInterval(() => elapsed++, 1000);
		} else {
			if (timer) { clearInterval(timer); timer = null; }
			elapsed = 0;
		}
		return () => { if (timer) clearInterval(timer); };
	});

	function toggleRecording() {
		if (roomStore.isRecording) {
			roomStore.setRecording(false);
		} else {
			roomStore.setRecording(true, crypto.randomUUID());
		}
	}

	function formatTime(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
	}
</script>

<div class="recording-controls">
	<button
		class="rec-btn"
		class:active={roomStore.isRecording}
		onclick={toggleRecording}
		title={roomStore.isRecording ? 'Stop recording' : 'Start recording'}
	>
		<span class="rec-dot"></span>
		{roomStore.isRecording ? 'Stop' : 'Record'}
	</button>
	{#if roomStore.isRecording}
		<span class="elapsed">{formatTime(elapsed)}</span>
	{/if}
</div>

<style>
	.recording-controls { display: flex; align-items: center; gap: 0.5rem; }
	.rec-btn { display: flex; align-items: center; gap: 0.35rem; background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #444); border-radius: 8px; padding: 0.4rem 0.75rem; cursor: pointer; color: inherit; font-size: 0.85rem; transition: all 0.15s; }
	.rec-btn.active { background: #ef4444; border-color: #ef4444; color: white; }
	.rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
	.rec-btn.active .rec-dot { background: white; animation: pulse 1s infinite; }
	.elapsed { font-family: monospace; font-size: 0.85rem; color: #ef4444; }
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
