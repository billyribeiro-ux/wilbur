<script lang="ts">
	import { whiteboardStore, type WhiteboardTool } from '$lib/stores';

	const tools: { id: WhiteboardTool; icon: string; label: string }[] = [
		{ id: 'select', icon: '👆', label: 'Select' },
		{ id: 'hand', icon: '✋', label: 'Pan' },
		{ id: 'pen', icon: '✏️', label: 'Pen' },
		{ id: 'highlighter', icon: '🖍️', label: 'Highlighter' },
		{ id: 'eraser', icon: '🧹', label: 'Eraser' },
		{ id: 'text', icon: '📝', label: 'Text' },
		{ id: 'rectangle', icon: '⬜', label: 'Rectangle' },
		{ id: 'circle', icon: '⭕', label: 'Circle' },
		{ id: 'arrow', icon: '➡️', label: 'Arrow' },
		{ id: 'line', icon: '📏', label: 'Line' },
		{ id: 'laser', icon: '🔴', label: 'Laser' },
		{ id: 'emoji', icon: '😀', label: 'Emoji' },
	];

	const colors = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
	const sizes = [1, 2, 3, 5, 8, 12, 20];

	let { onexport, onclear }: { onexport?: () => void; onclear?: () => void } = $props();
</script>

<div class="toolbar">
	<div class="tool-group">
		{#each tools as t (t.id)}
			<button
				class="tool-btn"
				class:active={whiteboardStore.tool === t.id}
				onclick={() => whiteboardStore.setTool(t.id)}
				title={t.label}
			>{t.icon}</button>
		{/each}
	</div>

	<div class="divider"></div>

	<div class="color-group">
		{#each colors as c (c)}
			<button
				class="color-swatch"
				class:active={whiteboardStore.color === c}
				style:background={c}
				onclick={() => whiteboardStore.setColor(c)}
				aria-label="Select color {c}"
			></button>
		{/each}
	</div>

	<div class="divider"></div>

	<div class="size-group">
		<label>
			<span>Size</span>
			<select value={whiteboardStore.size} onchange={(e) => whiteboardStore.setSize(Number(e.currentTarget.value))}>
				{#each sizes as s (s)}<option value={s}>{s}px</option>{/each}
			</select>
		</label>
		<label>
			<span>Opacity</span>
			<input type="range" min="0" max="1" step="0.1" value={whiteboardStore.opacity} oninput={(e) => whiteboardStore.setOpacity(Number(e.currentTarget.value))} />
		</label>
	</div>

	<div class="divider"></div>

	<div class="action-group">
		<button class="action-btn" onclick={() => whiteboardStore.undo()} disabled={!whiteboardStore.canUndo} title="Undo">↩️</button>
		<button class="action-btn" onclick={() => whiteboardStore.redo()} disabled={!whiteboardStore.canRedo} title="Redo">↪️</button>
		<button class="action-btn" onclick={onclear} title="Clear">🗑️</button>
		<button class="action-btn" onclick={onexport} title="Export">📥</button>
	</div>
</div>

<style>
	.toolbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--surface-2, #1e1e2e); border-radius: 10px; flex-wrap: wrap; }
	.tool-group, .color-group, .size-group, .action-group { display: flex; align-items: center; gap: 0.25rem; }
	.divider { width: 1px; height: 28px; background: var(--border, #444); margin: 0 0.25rem; }
	.tool-btn { background: none; border: 1px solid transparent; border-radius: 6px; padding: 0.3rem 0.45rem; cursor: pointer; font-size: 1rem; transition: all 0.15s; }
	.tool-btn.active { background: var(--color-primary, #3b82f6); border-color: var(--color-primary, #3b82f6); }
	.tool-btn:hover:not(.active) { background: var(--surface-3, #2a2a3e); }
	.color-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.1s; }
	.color-swatch.active { border-color: var(--color-primary, #3b82f6); transform: scale(1.2); }
	.size-group label { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary, #aaa); }
	.size-group select { background: var(--surface-3, #2a2a3e); color: inherit; border: 1px solid var(--border, #444); border-radius: 4px; padding: 0.15rem 0.3rem; font-size: 0.75rem; }
	.size-group input[type="range"] { width: 60px; accent-color: var(--color-primary, #3b82f6); }
	.action-btn { background: none; border: 1px solid transparent; border-radius: 6px; padding: 0.3rem 0.45rem; cursor: pointer; font-size: 1rem; }
	.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.action-btn:hover:not(:disabled) { background: var(--surface-3, #2a2a3e); }
</style>
