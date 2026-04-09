<script lang="ts">
	import { roomStore } from '$lib/stores';

	let { onclose }: { onclose: () => void } = $props();
	let title = $state('');
	let description = $state('');
	let options = $state(['', '']);
	let isSubmitting = $state(false);

	function addOption() { if (options.length < 10) options = [...options, '']; }
	function removeOption(i: number) { if (options.length > 2) options = options.filter((_, idx) => idx !== i); }
	function updateOption(i: number, val: string) { options = options.map((o, idx) => idx === i ? val : o); }

	async function handleSubmit() {
		const validOptions = options.filter(o => o.trim());
		if (!title.trim() || validOptions.length < 2) return;
		isSubmitting = true;
		const ok = await roomStore.createPoll({ title: title.trim(), description: description.trim(), options: validOptions });
		isSubmitting = false;
		if (ok) onclose();
	}
</script>

<div class="modal-overlay" role="presentation" onclick={onclose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h3>Create Poll</h3>
			<button class="close-btn" onclick={onclose}>✕</button>
		</div>
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<label>
				<span>Question</span>
				<input type="text" bind:value={title} placeholder="What do you want to ask?" required />
			</label>
			<label>
				<span>Description (optional)</span>
				<input type="text" bind:value={description} placeholder="Add context..." />
			</label>
			<fieldset>
				<legend>Options</legend>
				{#each options as opt, i}
					<div class="option-row">
						<input type="text" value={opt} oninput={(e) => updateOption(i, e.currentTarget.value)} placeholder="Option {i + 1}" required />
						{#if options.length > 2}
							<button type="button" class="remove-btn" onclick={() => removeOption(i)}>✕</button>
						{/if}
					</div>
				{/each}
				{#if options.length < 10}
					<button type="button" class="add-btn" onclick={addOption}>+ Add option</button>
				{/if}
			</fieldset>
			<div class="actions">
				<button type="button" onclick={onclose}>Cancel</button>
				<button type="submit" class="primary" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Poll'}</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.modal { background: var(--surface-2, #1e1e2e); border-radius: 12px; padding: 1.25rem; width: 420px; max-width: 95vw; max-height: 80vh; overflow-y: auto; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
	.modal-header h3 { margin: 0; }
	.close-btn { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; }
	form { display: flex; flex-direction: column; gap: 0.75rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
	input { padding: 0.5rem; border: 1px solid var(--border, #444); border-radius: 6px; background: var(--surface-3, #2a2a3e); color: inherit; font-size: 0.85rem; }
	fieldset { border: 1px solid var(--border, #444); border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
	legend { font-size: 0.85rem; padding: 0 0.25rem; }
	.option-row { display: flex; gap: 0.35rem; }
	.option-row input { flex: 1; }
	.remove-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem; padding: 0 0.35rem; }
	.add-btn { background: none; border: 1px dashed var(--border, #555); border-radius: 6px; padding: 0.4rem; color: var(--text-secondary, #aaa); cursor: pointer; font-size: 0.8rem; }
	.actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
	.actions button { padding: 0.45rem 1rem; border-radius: 6px; border: 1px solid var(--border, #444); background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem; }
	.actions .primary { background: var(--color-primary, #3b82f6); color: white; border: none; }
	.actions .primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
