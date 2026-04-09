<script lang="ts">
	import { privateChatStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let { onselect }: { onselect?: (userId: string) => void } = $props();

	onMount(() => { privateChatStore.fetchChats(); });
</script>

<div class="chat-list">
	<div class="chat-header">
		<h3>💬 Direct Messages</h3>
	</div>

	{#if privateChatStore.isLoading}
		<div class="loading">Loading...</div>
	{:else if privateChatStore.chats.length === 0}
		<div class="empty">No conversations yet. Click a member to start a chat.</div>
	{:else}
		{#each privateChatStore.chats as chat (chat.id)}
			<button
				class="chat-item"
				class:active={privateChatStore.activeChat?.id === chat.id}
				onclick={() => {
					privateChatStore.openChat(chat.user1Id === chat.otherUser?.id ? chat.user1Id : chat.user2Id);
					onselect?.(chat.id);
				}}
			>
				<div class="avatar">
					{#if chat.otherUser?.avatarUrl}
						<img src={chat.otherUser.avatarUrl} alt="" />
					{:else}
						<span>{chat.otherUser?.displayName?.charAt(0) ?? '?'}</span>
					{/if}
				</div>
				<div class="chat-info">
					<span class="name">{chat.otherUser?.displayName ?? 'Unknown'}</span>
					<span class="preview">{chat.lastMessage?.content ?? 'No messages yet'}</span>
				</div>
			</button>
		{/each}
	{/if}
</div>

<style>
	.chat-list { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
	.chat-header { padding: 0.75rem; border-bottom: 1px solid var(--border, #333); }
	.chat-header h3 { margin: 0; font-size: 0.95rem; }
	.loading, .empty { padding: 2rem; text-align: center; color: var(--text-secondary, #888); font-size: 0.85rem; }
	.chat-item { display: flex; gap: 0.65rem; padding: 0.65rem 0.75rem; border: none; background: transparent; color: inherit; cursor: pointer; text-align: left; width: 100%; transition: background 0.15s; }
	.chat-item:hover, .chat-item.active { background: var(--surface-2, #1e1e2e); }
	.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary, #3b82f6); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; font-size: 0.85rem; color: white; }
	.avatar img { width: 100%; height: 100%; object-fit: cover; }
	.chat-info { display: flex; flex-direction: column; min-width: 0; }
	.name { font-weight: 600; font-size: 0.85rem; }
	.preview { font-size: 0.75rem; color: var(--text-secondary, #888); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
