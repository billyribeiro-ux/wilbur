<script lang="ts">
	import { pb, Collections } from '$lib/services/pocketbase';
	import { roomStore } from '$lib/stores';
	import { onMount } from 'svelte';

	interface RoomNote {
		id: string; title: string; content: string; createdBy: string;
		createdAt: string; updatedAt: string;
	}

	let notes = $state<RoomNote[]>([]);
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editContent = $state('');
	let isCreating = $state(false);

	onMount(() => { if (roomStore.currentRoomId) fetchNotes(roomStore.currentRoomId); });

	async function fetchNotes(roomId: string) {
		try {
			const records = await pb.collection(Collections.ROOM_NOTES).getFullList({ filter: `room = "${roomId}"`, sort: '-updated' });
			notes = records.map(r => ({ id: r.id, title: r.title as string, content: r.content as string, createdBy: r.createdBy as string, createdAt: r.created as string, updatedAt: r.updated as string }));
		} catch { console.error('Failed to fetch notes'); }
	}

	function startCreate() { isCreating = true; editTitle = ''; editContent = ''; editingId = null; }
	function startEdit(note: RoomNote) { editingId = note.id; editTitle = note.title; editContent = note.content; isCreating = false; }
	function cancel() { editingId = null; isCreating = false; }

	async function save() {
		const roomId = roomStore.currentRoomId;
		if (!roomId) return;
		const userId = pb.authStore.model?.id;
		try {
			if (editingId) {
				await pb.collection(Collections.ROOM_NOTES).update(editingId, { title: editTitle, content: editContent });
			} else {
				await pb.collection(Collections.ROOM_NOTES).create({ room: roomId, createdBy: userId, title: editTitle, content: editContent });
			}
			cancel();
			await fetchNotes(roomId);
		} catch { console.error('Failed to save note'); }
	}

	async function deleteNote(id: string) {
		try {
			await pb.collection(Collections.ROOM_NOTES).delete(id);
			notes = notes.filter(n => n.id !== id);
		} catch { console.error('Failed to delete note'); }
	}
</script>

<div class="notes-panel">
	<div class="notes-header">
		<h3>📝 Notes</h3>
		<button class="btn-new" onclick={startCreate}>+ New</button>
	</div>

	{#if isCreating || editingId}
		<div class="note-editor">
			<input type="text" bind:value={editTitle} placeholder="Note title..." />
			<textarea bind:value={editContent} placeholder="Write your note..." rows="6"></textarea>
			<div class="editor-actions">
				<button onclick={cancel}>Cancel</button>
				<button class="primary" onclick={save} disabled={!editTitle.trim()}>{editingId ? 'Update' : 'Save'}</button>
			</div>
		</div>
	{/if}

	{#if notes.length === 0 && !isCreating}
		<div class="empty">No notes in this room</div>
	{:else}
		<div class="notes-list">
			{#each notes as note (note.id)}
				<div class="note-card">
					<div class="note-title">{note.title}</div>
					<div class="note-preview">{note.content.slice(0, 120)}{note.content.length > 120 ? '...' : ''}</div>
					<div class="note-meta">
						<span>{new Date(note.updatedAt).toLocaleDateString()}</span>
						<div class="note-actions">
							<button onclick={() => startEdit(note)}>✏️</button>
							<button onclick={() => deleteNote(note.id)}>🗑️</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.notes-panel { display: flex; flex-direction: column; gap: 0.5rem; height: 100%; padding: 0.75rem; overflow-y: auto; }
	.notes-header { display: flex; justify-content: space-between; align-items: center; }
	.notes-header h3 { margin: 0; font-size: 0.95rem; }
	.btn-new { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
	.empty { text-align: center; color: var(--text-secondary, #888); padding: 2rem 0; font-size: 0.85rem; }
	.note-editor { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: var(--surface-2, #1e1e2e); border-radius: 8px; }
	.note-editor input, .note-editor textarea { padding: 0.5rem; border: 1px solid var(--border, #444); border-radius: 6px; background: var(--surface-3, #2a2a3e); color: inherit; font-size: 0.85rem; resize: vertical; }
	.editor-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
	.editor-actions button { padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid var(--border, #444); background: transparent; color: inherit; cursor: pointer; font-size: 0.8rem; }
	.editor-actions .primary { background: var(--color-primary, #3b82f6); color: white; border: none; }
	.notes-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.note-card { background: var(--surface-2, #1e1e2e); border-radius: 8px; padding: 0.65rem; }
	.note-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.25rem; }
	.note-preview { font-size: 0.8rem; color: var(--text-secondary, #aaa); line-height: 1.4; }
	.note-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem; font-size: 0.7rem; color: var(--text-secondary, #666); }
	.note-actions { display: flex; gap: 0.25rem; }
	.note-actions button { background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.1rem; }
</style>
