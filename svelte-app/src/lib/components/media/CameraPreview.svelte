<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { enabled = false }: { enabled?: boolean } = $props();
	let videoEl: HTMLVideoElement | undefined = $state();
	let stream: MediaStream | null = $state(null);
	let error = $state<string | null>(null);
	let permissionState = $state<'prompt' | 'granted' | 'denied'>('prompt');

	async function startCamera() {
		try {
			error = null;
			stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
			if (videoEl) { videoEl.srcObject = stream; }
			permissionState = 'granted';
		} catch (err) {
			permissionState = 'denied';
			error = err instanceof Error ? err.message : 'Camera access denied';
		}
	}

	function stopCamera() {
		stream?.getTracks().forEach(t => t.stop());
		stream = null;
		if (videoEl) videoEl.srcObject = null;
	}

	$effect(() => {
		if (enabled) startCamera(); else stopCamera();
	});

	onDestroy(() => stopCamera());
</script>

<div class="camera-preview">
	{#if error}
		<div class="error">
			<span>📷</span>
			<p>{error}</p>
			<button onclick={startCamera}>Retry</button>
		</div>
	{:else if !enabled}
		<div class="off"><span>📷 Camera Off</span></div>
	{:else}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={videoEl} autoplay playsinline muted class="video"></video>
	{/if}
</div>

<style>
	.camera-preview { width: 100%; aspect-ratio: 4/3; background: #111; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
	.video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
	.off, .error { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--text-secondary, #888); font-size: 0.85rem; }
	.error button { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
</style>
