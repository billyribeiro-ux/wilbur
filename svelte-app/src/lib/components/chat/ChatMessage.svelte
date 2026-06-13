<script lang="ts">
	import { authStore } from '$lib/stores';
	import type { ChatMessage } from '$lib/types';
	import { PushPinIcon, PaperclipIcon, TrashIcon } from 'phosphor-svelte';
	import { formatRelativeTime } from '$lib/utils/format';

	let {
		message,
		isOwn,
		showAvatar,
		onpin,
		ondelete
	}: {
		message: ChatMessage;
		isOwn: boolean;
		showAvatar: boolean;
		onpin: (id: string) => void;
		ondelete: (id: string) => void;
	} = $props();

	const roleColor = $derived(
		message.user?.role === 'admin'
			? 'text-yellow-400'
			: message.user?.role === 'moderator'
				? 'text-purple-400'
				: 'text-surface-300'
	);
</script>

<div class="group chat-message-enter flex gap-3 {isOwn ? 'flex-row-reverse' : ''}">
	<!-- Avatar -->
	{#if showAvatar}
		<div class="flex-shrink-0">
			{#if message.user?.avatarUrl}
				<img src={message.user.avatarUrl} alt={message.user.displayName} class="h-8 w-8 rounded-full object-cover" />
			{:else}
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium">
					{message.user?.displayName?.[0]?.toUpperCase() || '?'}
				</div>
			{/if}
		</div>
	{:else}
		<div class="w-8"></div>
	{/if}

	<!-- Message Content -->
	<div class="flex-1 max-w-[80%] {isOwn ? 'text-right' : ''}">
		{#if showAvatar}
			<div class="mb-1 flex items-center gap-2 {isOwn ? 'justify-end' : ''}">
				<span class="text-sm font-medium {roleColor}">{message.user?.displayName || 'Unknown'}</span>
				{#if message.user?.role && message.user.role !== 'member'}
					<span class="rounded px-1.5 py-0.5 text-xs {message.user.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}">
						{message.user.role}
					</span>
				{/if}
				<span class="text-xs text-surface-500">{formatRelativeTime(message.createdAt)}</span>
			</div>
		{/if}

		<div class="inline-block rounded-2xl px-4 py-2 {isOwn ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-100'}">
			{#if message.contentType === 'image' && message.fileUrl}
				<img src={message.fileUrl} alt={message.content || 'Shared image'} class="max-w-full rounded-lg" />
			{:else if message.contentType === 'file' && message.fileUrl}
				<a href={message.fileUrl} download={message.content || 'download'} class="flex items-center gap-2 underline">
					<PaperclipIcon class="h-4 w-4" />
					{message.content || 'Download file'}
				</a>
			{/if}
			{#if message.contentType !== 'file'}
				<!-- Plain text: Svelte auto-escapes, so there is no XSS sink here. -->
				<p class="whitespace-pre-wrap break-words">{message.content}</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition {isOwn ? 'justify-end' : ''}">
			{#if !message.isPinned && authStore.canModerate}
				<button
					onclick={() => onpin(message.id)}
					class="rounded p-1 text-surface-500 hover:bg-surface-700 hover:text-surface-300"
					title="Pin message"
				>
					<PushPinIcon class="h-3.5 w-3.5" />
				</button>
			{/if}
			{#if isOwn || authStore.canModerate}
				<button
					onclick={() => ondelete(message.id)}
					class="rounded p-1 text-surface-500 hover:bg-red-500/20 hover:text-red-400"
					title="Delete message"
				>
					<TrashIcon class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
	</div>
</div>
