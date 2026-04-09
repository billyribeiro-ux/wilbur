<script lang="ts">
	let { title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default', onconfirm, oncancel }: {
		title: string; message: string; confirmText?: string; cancelText?: string;
		variant?: 'default' | 'danger'; onconfirm: () => void; oncancel: () => void;
	} = $props();
</script>

<div class="overlay" role="presentation" onclick={oncancel}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<h3>{title}</h3>
		<p>{message}</p>
		<div class="actions">
			<button onclick={oncancel}>{cancelText}</button>
			<button class="confirm" class:danger={variant === 'danger'} onclick={onconfirm}>{confirmText}</button>
		</div>
	</div>
</div>

<style>
	.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 150; }
	.dialog { background: var(--surface-2, #1e1e2e); border-radius: 12px; padding: 1.5rem; width: 380px; max-width: 90vw; }
	h3 { margin: 0 0 0.5rem; font-size: 1rem; }
	p { margin: 0 0 1.25rem; font-size: 0.85rem; color: var(--text-secondary, #aaa); }
	.actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
	.actions button { padding: 0.4rem 0.85rem; border-radius: 6px; border: 1px solid var(--border, #444); background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem; }
	.confirm { background: var(--color-primary, #3b82f6); color: white; border: none; }
	.confirm.danger { background: #ef4444; }
</style>
