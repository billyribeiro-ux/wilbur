<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import { authStore } from '$lib/stores';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();

	// Initialize auth on mount
	$effect(() => {
		authStore.refresh();
	});
</script>

<svelte:head>
	<title>Wilbur Trading Room</title>
	<meta name="description" content="Real-time collaboration platform for traders" />
</svelte:head>

<div class="min-h-screen bg-surface-900 text-surface-50">
	{@render children()}
</div>

<ToastContainer />
<Toaster position="bottom-right" richColors />
