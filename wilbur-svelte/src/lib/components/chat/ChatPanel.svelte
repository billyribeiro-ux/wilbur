<script lang="ts">
	import { roomStore, authStore, toastStore } from '$lib/stores';
	import { presenceStore } from '$lib/stores/presence.svelte';
	import { PaperPlaneRight, Image, Paperclip, Smiley, PushPin, Trash, DotsThree } from 'phosphor-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import DOMPurify from 'dompurify';
	import TypingIndicator from './TypingIndicator.svelte';

	let messageInput = $state('');
	let isSubmitting = $state(false);
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let optimisticMessages = $state<Array<{ id: string; content: string; pending: boolean }>>([]);

	// Auto-scroll to bottom when new messages arrive
	$effect(() => {
		if (messagesContainer && roomStore.messages.length > 0) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});

	// Handle typing indicator
	function handleTyping() {
		if (roomStore.currentRoomId && authStore.user) {
			presenceStore.startTyping(
				roomStore.currentRoomId,
				authStore.user.id,
				authStore.user.displayName
			);
		}
	}

	async function handleSendMessage(e: Event) {
		e.preventDefault();
		if (!messageInput.trim() || isSubmitting) return;

		isSubmitting = true;
		const content = messageInput.trim();
		messageInput = '';

		// Stop typing indicator
		if (roomStore.currentRoomId && authStore.user) {
			presenceStore.stopTyping(roomStore.currentRoomId, authStore.user.id);
		}

		// Optimistic update - show message immediately
		const optimisticId = `optimistic-${Date.now()}`;
		optimisticMessages = [...optimisticMessages, { id: optimisticId, content, pending: true }];

		const success = await roomStore.sendMessage(content);

		// Remove optimistic message (real one will come from subscription)
		optimisticMessages = optimisticMessages.filter(m => m.id !== optimisticId);

		if (!success) {
			toastStore.error('Failed to send message');
			messageInput = content; // Restore message
		}

		isSubmitting = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage(e);
		}
	}

	function handleInput() {
		handleTyping();
	}

	async function handlePinMessage(messageId: string) {
		const success = await roomStore.pinMessage(messageId);
		if (success) {
			toastStore.success('Message pinned');
		}
	}

	async function handleDeleteMessage(messageId: string) {
		const success = await roomStore.deleteMessage(messageId);
		if (success) {
			toastStore.success('Message deleted');
		}
	}

	function formatTime(dateString: string): string {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true });
	}

	function sanitizeContent(content: string): string {
		return DOMPurify.sanitize(content);
	}

	function isOwnMessage(userId: string): boolean {
		return userId === authStore.user?.id;
	}

	function canModerate(): boolean {
		const role = authStore.user?.role;
		return role === 'admin' || role === 'host' || role === 'moderator';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Pinned Messages -->
	{#if roomStore.pinnedMessages.length > 0}
		<div class="border-b border-surface-700 bg-primary-500/5 px-4 py-3">
			<div class="flex items-center gap-2 text-sm text-primary-400">
				<PushPin class="h-4 w-4" />
				<span class="font-medium">Pinned</span>
			</div>
			<div class="mt-2 space-y-2">
				{#each roomStore.pinnedMessages.slice(0, 2) as message}
					<div class="rounded-lg bg-surface-800/50 px-3 py-2 text-sm">
						<span class="font-medium text-surface-300">{message.user?.displayName || 'Unknown'}:</span>
						<span class="text-surface-400 ml-1">{@html sanitizeContent(message.content)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Messages -->
	<div
		bind:this={messagesContainer}
		class="flex-1 overflow-y-auto px-4 py-4 space-y-4"
	>
		{#if roomStore.messages.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="rounded-full bg-surface-800 p-4">
					<PaperPlaneRight class="h-8 w-8 text-surface-500" />
				</div>
				<h3 class="mt-4 font-medium">No messages yet</h3>
				<p class="mt-1 text-sm text-surface-400">Be the first to say something!</p>
			</div>
		{:else}
			{#each roomStore.messages as message, i}
				{@const showAvatar = i === 0 || roomStore.messages[i - 1]?.userId !== message.userId}
				{@const isOwn = isOwnMessage(message.userId)}

				<div class="group chat-message-enter flex gap-3 {isOwn ? 'flex-row-reverse' : ''}">
					<!-- Avatar -->
					{#if showAvatar}
						<div class="flex-shrink-0">
							{#if message.user?.avatarUrl}
								<img
									src={message.user.avatarUrl}
									alt={message.user.displayName}
									class="h-8 w-8 rounded-full object-cover"
								/>
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
								<span class="text-sm font-medium {message.user?.role === 'admin' ? 'text-yellow-400' : message.user?.role === 'moderator' ? 'text-purple-400' : 'text-surface-300'}">
									{message.user?.displayName || 'Unknown'}
								</span>
								{#if message.user?.role && message.user.role !== 'member'}
									<span class="rounded px-1.5 py-0.5 text-xs {message.user.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}">
										{message.user.role}
									</span>
								{/if}
								<span class="text-xs text-surface-500">{formatTime(message.createdAt)}</span>
							</div>
						{/if}

						<div class="inline-block rounded-2xl px-4 py-2 {isOwn ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-100'}">
							{#if message.contentType === 'image' && message.fileUrl}
								<img
									src={message.fileUrl}
									alt="Shared image"
									class="max-w-full rounded-lg"
								/>
							{/if}
							<p class="whitespace-pre-wrap break-words">{@html sanitizeContent(message.content)}</p>
						</div>

						<!-- Actions -->
						<div class="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition {isOwn ? 'justify-end' : ''}">
							{#if !message.isPinned && canModerate()}
								<button
									onclick={() => handlePinMessage(message.id)}
									class="rounded p-1 text-surface-500 hover:bg-surface-700 hover:text-surface-300"
									title="Pin message"
								>
									<PushPin class="h-3.5 w-3.5" />
								</button>
							{/if}
							{#if isOwn || canModerate()}
								<button
									onclick={() => handleDeleteMessage(message.id)}
									class="rounded p-1 text-surface-500 hover:bg-red-500/20 hover:text-red-400"
									title="Delete message"
								>
									<Trash class="h-3.5 w-3.5" />
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Typing Indicator -->
	<TypingIndicator />

	<!-- Input -->
	<form
		onsubmit={handleSendMessage}
		class="border-t border-surface-700 p-4"
	>
		<div class="flex items-end gap-3">
			<div class="flex gap-1">
				<button
					type="button"
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Add image"
				>
					<Image class="h-5 w-5" />
				</button>
				<button
					type="button"
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Attach file"
				>
					<Paperclip class="h-5 w-5" />
				</button>
				<button
					type="button"
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Add emoji"
				>
					<Smile class="h-5 w-5" />
				</button>
			</div>

			<div class="flex-1">
				<textarea
					bind:value={messageInput}
					onkeydown={handleKeyDown}
					oninput={handleInput}
					placeholder="Type a message..."
					rows="1"
					class="w-full resize-none rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
				></textarea>
			</div>

			<button
				type="submit"
				disabled={!messageInput.trim() || isSubmitting}
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
			>
				<PaperPlaneRight class="h-5 w-5" />
			</button>
		</div>
	</form>
</div>
