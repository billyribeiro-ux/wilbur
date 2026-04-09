<script lang="ts">
	import { onDestroy } from 'svelte';

	let isSharing = $state(false);
	let stream: MediaStream | null = $state(null);
	let videoEl: HTMLVideoElement | undefined = $state();
	let error = $state<string | null>(null);

	async function startSharing() {
		try {
			error = null;
			stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
			if (videoEl) videoEl.srcObject = stream;
			isSharing = true;
			// Handle user ending share via browser UI
			stream.getVideoTracks()[0]?.addEventListener('ended', stopSharing);
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				error = err instanceof Error ? err.message : 'Screen share failed';
			}
		}
	}

	function stopSharing() {
		stream?.getTracks().forEach(t => t.stop());
		stream = null;
		isSharing = false;
		if (videoEl) videoEl.srcObject = null;
	}

	onDestroy(() => stopSharing());
</script>

<div class="screen-share">
	{#if isSharing}
		<div class="sharing-view">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} autoplay playsinline class="share-video"></video>
			<button class="stop-btn" onclick={stopSharing}>⏹ Stop Sharing</button>
		</div>
	{:else}
		<button class="share-btn" onclick={startSharing}>🖥️ Share Screen</button>
	{/if}
	{#if error}
		<div class="error">{error}</div>
	{/if}
</div>

<style>
	.screen-share { display: flex; flex-direction: column; gap: 0.5rem; }
	.share-btn { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem; justify-content: center; }
	.sharing-view { position: relative; border-radius: 8px; overflow: hidden; background: #111; }
	.share-video { width: 100%; max-height: 300px; object-fit: contain; }
	.stop-btn { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; border: none; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
	.error { color: #ef4444; font-size: 0.8rem; text-align: center; }
</style>
