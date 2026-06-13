<script lang="ts">
	import { roomStore, authStore, toastStore } from '$lib/stores';
	import { presenceStore } from '$lib/stores/presence.svelte';
	import { PaperPlaneRightIcon, ImageIcon, PaperclipIcon, SmileyIcon, PushPinIcon, TrashIcon } from 'phosphor-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import DOMPurify from 'dompurify';
	import { chatMessageSchema, validateWithSchema } from '$lib/validation/schemas';
	import TypingIndicator from './TypingIndicator.svelte';
	import EmojiPicker from '$lib/components/ui/EmojiPicker.svelte';

	/** Rich snippets use `{@html}` only after `sanitizeContent()` (DOMPurify). */

	let messageInput = $state('');
	let isSubmitting = $state(false);
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let optimisticMessages = $state<Array<{ id: string; content: string; pending: boolean }>>([]);
	let showEmojiPicker = $state(false);
	let imageInput = $state<HTMLInputElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	const MAX_UPLOAD_BYTES = 1024 * 1024; // 1MB — embedded as a data URL, so keep it small

	function insertEmoji(emoji: string) {
		messageInput += emoji;
		showEmojiPicker = false;
	}

	function readAsDataURL(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	async function handleUpload(e: Event, contentType: 'image' | 'file') {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // allow re-selecting the same file
		if (!file) return;
		if (file.size > MAX_UPLOAD_BYTES) {
			toastStore.error('File too large (max 1MB)');
			return;
		}
		try {
			const dataUrl = await readAsDataURL(file);
			const ok = await roomStore.sendMessage(file.name, contentType, dataUrl);
			if (!ok) toastStore.error('Failed to send attachment');
		} catch {
			toastStore.error('Could not read file');
		}
	}

	// Auto-scroll to bottom when new (real or pending) messages arrive
	$effect(() => {
		const total = roomStore.messages.length + optimisticMessages.length;
		if (messagesContainer && total > 0) {
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

		// Validate against the shared chat-message schema (length/content rules).
		const validation = validateWithSchema(chatMessageSchema, { content: messageInput });
		if (!validation.success) {
			toastStore.error(validation.errors.content ?? 'Invalid message');
			return;
		}

		isSubmitting = true;
		const content = validation.data.content;
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
</script>

<div class="flex h-full flex-col">
	<!-- Pinned Messages -->
	{#if roomStore.pinnedMessages.length > 0}
		<div class="border-b border-surface-700 bg-primary-500/5 px-4 py-3">
			<div class="flex items-center gap-2 text-sm text-primary-400">
				<PushPinIcon class="h-4 w-4" />
				<span class="font-medium">Pinned</span>
			</div>
			<div class="mt-2 space-y-2">
				{#each roomStore.pinnedMessages.slice(0, 2) as message (message.id)}
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
		{#if roomStore.messages.length === 0 && optimisticMessages.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="rounded-full bg-surface-800 p-4">
					<PaperPlaneRightIcon class="h-8 w-8 text-surface-500" />
				</div>
				<h3 class="mt-4 font-medium">No messages yet</h3>
				<p class="mt-1 text-sm text-surface-400">Be the first to say something!</p>
			</div>
		{:else}
			{#each roomStore.messages as message, i (message.id)}
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
									alt={message.content || 'Shared image'}
									class="max-w-full rounded-lg"
								/>
							{:else if message.contentType === 'file' && message.fileUrl}
								<a
									href={message.fileUrl}
									download={message.content || 'download'}
									class="flex items-center gap-2 underline"
								>
									<PaperclipIcon class="h-4 w-4" />
									{message.content || 'Download file'}
								</a>
							{/if}
							{#if message.contentType !== 'file'}
								<p class="whitespace-pre-wrap break-words">{@html sanitizeContent(message.content)}</p>
							{/if}
						</div>

						<!-- Actions -->
						<div class="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition {isOwn ? 'justify-end' : ''}">
							{#if !message.isPinned && authStore.canModerate}
								<button
									onclick={() => handlePinMessage(message.id)}
									class="rounded p-1 text-surface-500 hover:bg-surface-700 hover:text-surface-300"
									title="Pin message"
								>
									<PushPinIcon class="h-3.5 w-3.5" />
								</button>
							{/if}
							{#if isOwn || authStore.canModerate}
								<button
									onclick={() => handleDeleteMessage(message.id)}
									class="rounded p-1 text-surface-500 hover:bg-red-500/20 hover:text-red-400"
									title="Delete message"
								>
									<TrashIcon class="h-3.5 w-3.5" />
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}

		<!-- Optimistic (pending) messages — shown immediately, replaced by the real one from the realtime subscription -->
		{#each optimisticMessages as om (om.id)}
			<div class="group flex gap-3 flex-row-reverse opacity-60">
				<div class="w-8"></div>
				<div class="flex-1 max-w-[80%] text-right">
					<div class="inline-block rounded-2xl bg-primary-500 px-4 py-2 text-white">
						<p class="whitespace-pre-wrap break-words">{@html sanitizeContent(om.content)}</p>
					</div>
					<div class="mt-1 text-xs text-surface-500">Sending…</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Typing Indicator -->
	<TypingIndicator />

	{#if showEmojiPicker}
		<EmojiPicker onselect={insertEmoji} onclose={() => (showEmojiPicker = false)} />
	{/if}

	<!-- Input -->
	<form
		onsubmit={handleSendMessage}
		class="relative border-t border-surface-700 p-4"
	>
		<input
			bind:this={imageInput}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={(e) => handleUpload(e, 'image')}
		/>
		<input
			bind:this={fileInput}
			type="file"
			class="hidden"
			onchange={(e) => handleUpload(e, 'file')}
		/>
		<div class="flex items-end gap-3">
			<div class="flex gap-1">
				<button
					type="button"
					onclick={() => imageInput?.click()}
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Add image"
				>
					<ImageIcon class="h-5 w-5" />
				</button>
				<button
					type="button"
					onclick={() => fileInput?.click()}
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Attach file"
				>
					<PaperclipIcon class="h-5 w-5" />
				</button>
				<button
					type="button"
					onclick={() => (showEmojiPicker = !showEmojiPicker)}
					class="rounded-lg p-2 text-surface-500 hover:bg-surface-700 hover:text-surface-300 transition"
					title="Add emoji"
				>
					<SmileyIcon class="h-5 w-5" />
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
				<PaperPlaneRightIcon class="h-5 w-5" />
			</button>
		</div>
	</form>
</div>
