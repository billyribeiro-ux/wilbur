<script lang="ts">
	import { presenceStore } from '$lib/stores/presence.svelte';

	// Reactive derived state
	const typingText = $derived(presenceStore.typingText);
	const hasTypingUsers = $derived(presenceStore.typingUsersList.length > 0);
</script>

{#if hasTypingUsers}
	<div class="flex items-center gap-2 px-4 py-2 text-sm text-surface-400 animate-in fade-in slide-in-from-bottom-2 duration-200">
		<div class="flex gap-1">
			<span class="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 0ms"></span>
			<span class="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 150ms"></span>
			<span class="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 300ms"></span>
		</div>
		<span>{typingText}</span>
	</div>
{/if}

<style>
	@keyframes bounce {
		0%, 60%, 100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-4px);
		}
	}

	.animate-bounce {
		animation: bounce 1s ease-in-out infinite;
	}
</style>
