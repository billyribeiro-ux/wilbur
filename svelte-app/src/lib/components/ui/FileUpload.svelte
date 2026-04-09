<script lang="ts">
	let { accept = '*', maxSizeMb = 10, onupload }: {
		accept?: string; maxSizeMb?: number; onupload: (file: File) => void;
	} = $props();

	let isDragOver = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();

	function validateAndUpload(file: File) {
		error = null;
		if (file.size > maxSizeMb * 1024 * 1024) {
			error = `File too large. Max size: ${maxSizeMb}MB`;
			return;
		}
		onupload(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) validateAndUpload(file);
	}

	function handleInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) validateAndUpload(file);
	}
</script>

<div
	class="file-upload"
	class:dragover={isDragOver}
	role="button"
	tabindex="0"
	aria-label="Upload file"
	ondragover={(e) => { e.preventDefault(); isDragOver = true; }}
	ondragleave={() => isDragOver = false}
	ondrop={handleDrop}
	onclick={() => fileInput?.click()}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); }}
>
	<input type="file" {accept} bind:this={fileInput} oninput={handleInput} hidden />
	<span class="upload-icon">📎</span>
	<span class="upload-text">Drop file or click to upload</span>
	<span class="upload-hint">Max {maxSizeMb}MB</span>
	{#if error}
		<span class="upload-error">{error}</span>
	{/if}
</div>

<style>
	.file-upload { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 1.25rem; border: 2px dashed var(--border, #444); border-radius: 10px; cursor: pointer; transition: all 0.15s; text-align: center; }
	.file-upload:hover, .file-upload.dragover { border-color: var(--color-primary, #3b82f6); background: rgba(59, 130, 246, 0.05); }
	.upload-icon { font-size: 1.5rem; }
	.upload-text { font-size: 0.85rem; }
	.upload-hint { font-size: 0.7rem; color: var(--text-secondary, #888); }
	.upload-error { font-size: 0.75rem; color: #ef4444; }
</style>
