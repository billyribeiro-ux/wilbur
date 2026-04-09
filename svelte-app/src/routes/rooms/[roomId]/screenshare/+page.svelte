<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores';
	import { ArrowLeftIcon } from 'phosphor-svelte';
	import ScreenShare from '$lib/components/media/ScreenShare.svelte';
	import CameraPreview from '$lib/components/media/CameraPreview.svelte';

	const roomId = page.params.roomId;
	let cameraEnabled = $state(false);

	$effect(() => {
		if (!authStore.isLoading && !authStore.isAuthenticated) goto('/auth/login');
	});
</script>

<div class="flex h-screen flex-col bg-surface-900">
	<header class="flex items-center gap-4 border-b border-surface-700 px-4 py-3">
		<a href="/rooms/{roomId}" class="flex items-center gap-2 rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
			<ArrowLeftIcon class="h-5 w-5" />
			<span>Back to Room</span>
		</a>
		<h1 class="font-semibold">Screen Share & Camera</h1>
	</header>
	<div class="flex-1 p-6 overflow-y-auto">
		<div class="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
			<div>
				<h2 class="text-lg font-semibold mb-3">Screen Share</h2>
				<ScreenShare />
			</div>
			<div>
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-lg font-semibold">Camera</h2>
					<button
						onclick={() => cameraEnabled = !cameraEnabled}
						class="rounded-lg px-3 py-1.5 text-sm border border-surface-600 text-surface-300 hover:text-white transition"
					>{cameraEnabled ? 'Turn Off' : 'Turn On'}</button>
				</div>
				<CameraPreview enabled={cameraEnabled} />
			</div>
		</div>
	</div>
</div>
