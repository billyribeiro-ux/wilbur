<script lang="ts">
	import { privateChatStore } from '$lib/stores';
	import { authStore } from '$lib/stores';
	import { onMount, onDestroy, tick } from 'svelte';

	let messageInput = $state('');
	let messagesEnd: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (privateChatStore.messages.length) {
			tick().then(() => messagesEnd?.scrollIntoView({ behavior: 'smooth' }));
		}
	});

	onMount(() => {
		if (privateChatStore.activeChat) {
			privateChatStore.subscribeToChat(privateChatStore.activeChat.id);
		}
	});

	onDestroy(() => { privateChatStore.unsubscribeFromChat(); });

	async function handleSend() {
		const content = messageInput.trim();
		if (!content) return;
		messageInput = '';
		await privateChatStore.sendMessage(content);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
	}

	const currentUserId = $derived(authStore.user?.id ?? '');
</script>

<div class="conversation">
	{#if !privateChatStore.activeChat}
		<div class="empty">Select a conversation to start chatting</div>
	{:else}
		<div class="conv-header">
			<button class="back-btn" onclick={() => privateChatStore.closeChat()}>← Back</button>
			<span class="conv-name">{privateChatStore.activeChat.otherUser?.displayName ?? 'Chat'}</span>
		</div>
		<div class="messages">
			{#each privateChatStore.messages as msg (msg.id)}
				<div class="msg" class:own={msg.senderId === currentUserId}>
					<div class="msg-bubble">
						<span class="msg-text">{msg.content}</span>
						<span class="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
					</div>
				</div>
			{/each}
			<div bind:this={messagesEnd}></div>
		</div>
		<form class="input-bar" onsubmit={(e) => { e.preventDefault(); handleSend(); }}>
			<input
				type="text"
				bind:value={messageInput}
				placeholder="Type a message..."
				onkeydown={handleKeydown}
			/>
			<button type="submit" disabled={!messageInput.trim()}>Send</button>
		</form>
	{/if}
</div>

<style>
	.conversation { display: flex; flex-direction: column; height: 100%; }
	.empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary, #888); font-size: 0.85rem; }
	.conv-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border, #333); }
	.back-btn { background: none; border: none; color: var(--color-primary, #3b82f6); cursor: pointer; font-size: 0.85rem; padding: 0; }
	.conv-name { font-weight: 600; font-size: 0.9rem; }
	.messages { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
	.msg { display: flex; }
	.msg.own { justify-content: flex-end; }
	.msg-bubble { max-width: 75%; padding: 0.45rem 0.7rem; border-radius: 12px; background: var(--surface-2, #1e1e2e); font-size: 0.85rem; }
	.msg.own .msg-bubble { background: var(--color-primary, #3b82f6); color: white; }
	.msg-text { word-break: break-word; }
	.msg-time { display: block; font-size: 0.65rem; opacity: 0.6; margin-top: 0.15rem; text-align: right; }
	.input-bar { display: flex; gap: 0.5rem; padding: 0.65rem 0.75rem; border-top: 1px solid var(--border, #333); }
	.input-bar input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid var(--border, #444); border-radius: 20px; background: var(--surface-3, #2a2a3e); color: inherit; font-size: 0.85rem; }
	.input-bar button { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 20px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; }
	.input-bar button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
