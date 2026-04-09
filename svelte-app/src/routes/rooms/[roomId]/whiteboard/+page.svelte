<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores';
	import { whiteboardStore } from '$lib/stores';
	import { onDestroy } from 'svelte';
	import { ArrowLeftIcon } from 'phosphor-svelte';
	import Whiteboard from '$lib/components/whiteboard/Whiteboard.svelte';

	const roomId = page.params.roomId;

	$effect(() => {
		if (!authStore.isLoading && !authStore.isAuthenticated) goto('/auth/login');
	});

	onDestroy(() => { whiteboardStore.reset(); });
</script>

<div class="flex h-screen flex-col bg-surface-900">
	<header class="flex items-center gap-4 border-b border-surface-700 px-4 py-3">
		<a href="/rooms/{roomId}" class="flex items-center gap-2 rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
			<ArrowLeftIcon class="h-5 w-5" />
			<span>Back to Room</span>
		</a>
		<h1 class="font-semibold">Whiteboard</h1>
	</header>
	<div class="flex-1 overflow-hidden">
		<Whiteboard />
	</div>
</div>
