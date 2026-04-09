<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, fallback }: { children: Snippet; fallback?: Snippet<[Error]> } = $props();
	let error = $state<Error | null>(null);

	function handleError(e: Event) {
		const err = (e as ErrorEvent).error;
		error = err instanceof Error ? err : new Error(String(err));
	}

	function reset() { error = null; }
</script>

<svelte:window onerror={handleError} />

{#if error}
	{#if fallback}
		{@render fallback(error)}
	{:else}
		<div class="error-boundary">
			<div class="error-card">
				<h3>⚠️ Something went wrong</h3>
				<p class="error-msg">{error.message}</p>
				<button onclick={reset}>Try Again</button>
			</div>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}

<style>
	.error-boundary { display: flex; align-items: center; justify-content: center; min-height: 200px; padding: 2rem; }
	.error-card { background: var(--surface-2, #1e1e2e); border: 1px solid #ef4444; border-radius: 12px; padding: 1.5rem; text-align: center; max-width: 400px; }
	.error-card h3 { margin: 0 0 0.5rem; }
	.error-msg { font-size: 0.85rem; color: var(--text-secondary, #aaa); margin: 0 0 1rem; word-break: break-word; }
	.error-card button { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 6px; padding: 0.45rem 1rem; cursor: pointer; font-size: 0.85rem; }
</style>
