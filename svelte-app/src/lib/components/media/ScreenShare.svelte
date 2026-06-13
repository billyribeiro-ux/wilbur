<script lang="ts">
	import { onDestroy } from 'svelte';
	import { liveKitRoom } from '$lib/services/livekit.svelte';

	let { roomName, participantName }: { roomName?: string; participantName?: string } = $props();

	let isLocalPreview = $state(false); // local-only getDisplayMedia preview (no transport)
	let stream: MediaStream | null = $state(null);
	let videoEl: HTMLVideoElement | undefined = $state();
	let error = $state<string | null>(null);
	let connecting = $state(false);

	const canUseLiveKit = $derived(!!roomName && !!participantName);
	const remoteScreens = $derived(liveKitRoom.remoteVideos.filter((v) => v.isScreenShare));

	async function startSharing() {
		error = null;

		// Prefer real LiveKit publishing when we have room context.
		if (canUseLiveKit) {
			connecting = true;
			const res = await liveKitRoom.connect(roomName!, participantName!);
			connecting = false;
			if (res.connected) {
				try {
					await liveKitRoom.setScreenShare(true);
					return;
				} catch (e) {
					error = e instanceof Error ? e.message : 'Failed to publish screen share';
					return;
				}
			}
			if (res.error) error = res.error;
			// Not configured → fall through to a local preview so the user still sees something.
		}

		await startLocalPreview();
	}

	async function startLocalPreview() {
		try {
			stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
			if (videoEl) videoEl.srcObject = stream;
			isLocalPreview = true;
			stream.getVideoTracks()[0]?.addEventListener('ended', stopSharing);
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				error = err instanceof Error ? err.message : 'Screen share failed';
			}
		}
	}

	async function stopSharing() {
		if (liveKitRoom.isScreenSharing) await liveKitRoom.setScreenShare(false);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		isLocalPreview = false;
		if (videoEl) videoEl.srcObject = null;
	}

	onDestroy(() => { stopSharing(); });
</script>

<div class="screen-share">
	{#if liveKitRoom.isScreenSharing}
		<div class="status sharing">🟢 You're sharing your screen with the room.</div>
		<button class="stop-btn" onclick={stopSharing}>⏹ Stop Sharing</button>
	{:else if isLocalPreview}
		<div class="sharing-view">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video bind:this={videoEl} autoplay playsinline muted class="share-video"></video>
			<button class="stop-btn" onclick={stopSharing}>⏹ Stop Sharing</button>
		</div>
		<div class="note">Local preview only — LiveKit isn't configured, so this isn't shared with the room yet.</div>
	{:else}
		<button class="share-btn" onclick={startSharing} disabled={connecting}>
			{connecting ? 'Connecting…' : '🖥️ Share Screen'}
		</button>
	{/if}

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if remoteScreens.length > 0}
		<div class="remote-grid">
			{#each remoteScreens as v (v.sid)}
				<div class="remote-tile">
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						autoplay
						playsinline
						class="share-video"
						{@attach (node) => { v.track.attach(node as HTMLVideoElement); return () => v.track.detach(node as HTMLVideoElement); }}
					></video>
					<span class="remote-name">{v.name}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.screen-share { display: flex; flex-direction: column; gap: 0.5rem; }
	.share-btn { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem; justify-content: center; }
	.share-btn:disabled { opacity: 0.6; cursor: progress; }
	.status { font-size: 0.85rem; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(34,197,94,0.12); }
	.sharing-view { position: relative; border-radius: 8px; overflow: hidden; background: #111; }
	.share-video { width: 100%; max-height: 300px; object-fit: contain; display: block; background: #000; border-radius: 8px; }
	.stop-btn { background: #ef4444; color: white; border: none; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
	.sharing-view .stop-btn { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); }
	.note { font-size: 0.75rem; color: var(--text-secondary, #888); }
	.error { color: #ef4444; font-size: 0.8rem; text-align: center; }
	.remote-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem; }
	.remote-tile { position: relative; }
	.remote-name { position: absolute; bottom: 6px; left: 6px; font-size: 0.7rem; background: rgba(0,0,0,0.6); color: white; padding: 0.1rem 0.4rem; border-radius: 4px; }
</style>
