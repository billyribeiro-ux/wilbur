<script lang="ts">
	let { src, alt = '', onclose }: { src: string; alt?: string; onclose: () => void } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-overlay" role="presentation" onclick={onclose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" role="dialog" aria-modal="true" aria-label="Image preview" tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<button class="close-btn" onclick={onclose}>✕</button>
		<img {src} {alt} class="full-image" />
	</div>
</div>

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; }
	.modal-content { position: relative; max-width: 90vw; max-height: 90vh; }
	.close-btn { position: absolute; top: -12px; right: -12px; background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #444); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: inherit; font-size: 0.9rem; z-index: 1; }
	.full-image { max-width: 90vw; max-height: 85vh; border-radius: 8px; object-fit: contain; }
</style>
