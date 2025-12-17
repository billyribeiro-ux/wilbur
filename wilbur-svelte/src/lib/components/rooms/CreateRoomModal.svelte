<script lang="ts">
	import { roomStore, toastStore } from '$lib/stores';
	import { X, TrendingUp } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let name = $state('');
	let title = $state('');
	let description = $state('');
	let tagsInput = $state('');
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		errors = {};

		if (!name.trim()) {
			errors.name = 'Room name is required';
		} else if (name.length < 2) {
			errors.name = 'Room name must be at least 2 characters';
		} else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
			errors.name = 'Room name can only contain letters, numbers, hyphens, and underscores';
		}

		if (!title.trim()) {
			errors.title = 'Room title is required';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validate()) return;

		isSubmitting = true;

		const tags = tagsInput
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0);

		// TODO: Get actual tenant ID from context
		const room = await roomStore.createRoom({
			name: name.trim(),
			title: title.trim(),
			description: description.trim() || undefined,
			tenantId: 'default-tenant', // This should come from user's tenant
			tags
		});

		if (room) {
			toastStore.success('Room created!', `${room.title} is ready`);
			onclose();
			goto(`/rooms/${room.id}`);
		} else {
			toastStore.error(roomStore.error || 'Failed to create room');
		}

		isSubmitting = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
	<div class="w-full max-w-lg rounded-2xl border border-surface-700 bg-surface-800 shadow-xl animate-in fade-in zoom-in-95 duration-200">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-surface-700 px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
					<TrendingUp class="h-5 w-5 text-primary-400" />
				</div>
				<h2 class="text-lg font-semibold">Create Trading Room</h2>
			</div>
			<button
				onclick={onclose}
				class="rounded-lg p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Form -->
		<form onsubmit={handleSubmit} class="p-6 space-y-5">
			<div>
				<label for="roomName" class="block text-sm font-medium text-surface-300 mb-2">
					Room Name *
				</label>
				<input
					id="roomName"
					type="text"
					bind:value={name}
					placeholder="e.g., crypto-signals"
					class="w-full rounded-lg border {errors.name ? 'border-red-500' : 'border-surface-600'} bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
				/>
				{#if errors.name}
					<p class="mt-1 text-sm text-red-400">{errors.name}</p>
				{:else}
					<p class="mt-1 text-xs text-surface-500">Used in URLs. Letters, numbers, hyphens only.</p>
				{/if}
			</div>

			<div>
				<label for="roomTitle" class="block text-sm font-medium text-surface-300 mb-2">
					Room Title *
				</label>
				<input
					id="roomTitle"
					type="text"
					bind:value={title}
					placeholder="e.g., Crypto Trading Signals"
					class="w-full rounded-lg border {errors.title ? 'border-red-500' : 'border-surface-600'} bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
				/>
				{#if errors.title}
					<p class="mt-1 text-sm text-red-400">{errors.title}</p>
				{/if}
			</div>

			<div>
				<label for="roomDescription" class="block text-sm font-medium text-surface-300 mb-2">
					Description
				</label>
				<textarea
					id="roomDescription"
					bind:value={description}
					rows="3"
					placeholder="What's this room about?"
					class="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none resize-none"
				></textarea>
			</div>

			<div>
				<label for="roomTags" class="block text-sm font-medium text-surface-300 mb-2">
					Tags
				</label>
				<input
					id="roomTags"
					type="text"
					bind:value={tagsInput}
					placeholder="e.g., crypto, bitcoin, day-trading"
					class="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
				/>
				<p class="mt-1 text-xs text-surface-500">Separate tags with commas</p>
			</div>

			<!-- Preview -->
			<div class="rounded-xl border border-surface-600 bg-surface-700/50 p-4">
				<p class="text-xs text-surface-500 mb-2">Preview</p>
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
						<TrendingUp class="h-6 w-6 text-primary-400" />
					</div>
					<div>
						<h3 class="font-semibold">{title || 'Room Title'}</h3>
						<p class="text-sm text-surface-400">{description || 'Room description will appear here'}</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-2">
				<button
					type="button"
					onclick={onclose}
					class="flex-1 rounded-lg border border-surface-600 px-4 py-3 font-medium text-surface-300 hover:bg-surface-700 transition"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					class="flex-1 rounded-lg bg-primary-500 px-4 py-3 font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
				>
					{isSubmitting ? 'Creating...' : 'Create Room'}
				</button>
			</div>
		</form>
	</div>
</div>
