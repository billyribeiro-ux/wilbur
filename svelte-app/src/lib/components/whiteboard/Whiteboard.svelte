<script lang="ts">
	import { whiteboardStore } from '$lib/stores';
	import WhiteboardCanvas from './WhiteboardCanvas.svelte';
	import WhiteboardToolbar from './WhiteboardToolbar.svelte';

	let showClearConfirm = $state(false);

	function handleClear() { showClearConfirm = true; }
	function confirmClear() { whiteboardStore.clearShapes(); showClearConfirm = false; }

	function handleExport() {
		const canvas = document.querySelector('.wb-canvas') as HTMLCanvasElement | null;
		if (!canvas) return;
		const link = document.createElement('a');
		link.download = `whiteboard-${Date.now()}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}
</script>

<div class="whiteboard">
	<WhiteboardToolbar onexport={handleExport} onclear={handleClear} />
	<div class="canvas-container">
		<WhiteboardCanvas />
	</div>
	<div class="status-bar">
		<span>{whiteboardStore.shapeCount} shape{whiteboardStore.shapeCount !== 1 ? 's' : ''}</span>
		<span>Zoom: {Math.round(whiteboardStore.viewport.zoom * 100)}%</span>
		<button class="reset-view" onclick={() => whiteboardStore.resetViewport()}>Reset View</button>
	</div>
</div>

{#if showClearConfirm}
	<div class="modal-overlay" role="presentation" onclick={() => showClearConfirm = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<h3>Clear Whiteboard?</h3>
			<p>This will remove all shapes. This action cannot be undone.</p>
			<div class="actions">
				<button onclick={() => showClearConfirm = false}>Cancel</button>
				<button class="danger" onclick={confirmClear}>Clear All</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.whiteboard { display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem; }
	.canvas-container { flex: 1; min-height: 0; border-radius: 8px; overflow: hidden; }
	.status-bar { display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; color: var(--text-secondary, #888); padding: 0 0.25rem; }
	.reset-view { background: none; border: 1px solid var(--border, #444); border-radius: 4px; padding: 0.15rem 0.5rem; color: inherit; cursor: pointer; font-size: 0.7rem; }
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.confirm-modal { background: var(--surface-2, #1e1e2e); border-radius: 12px; padding: 1.5rem; width: 360px; }
	.confirm-modal h3 { margin: 0 0 0.5rem; }
	.confirm-modal p { font-size: 0.85rem; color: var(--text-secondary, #aaa); margin: 0 0 1rem; }
	.actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
	.actions button { padding: 0.4rem 0.85rem; border-radius: 6px; border: 1px solid var(--border, #444); background: transparent; color: inherit; cursor: pointer; }
	.actions .danger { background: #ef4444; color: white; border: none; }
</style>
