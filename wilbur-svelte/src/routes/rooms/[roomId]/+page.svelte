<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { authStore, roomStore, toastStore } from '$lib/stores';
	import { ArrowLeft, Users, Bell, Settings, MessageSquare, TrendingUp, Menu, X } from 'lucide-svelte';
	import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
	import AlertsPanel from '$lib/components/alerts/AlertsPanel.svelte';
	import MembersPanel from '$lib/components/rooms/MembersPanel.svelte';

	// Get room ID from URL
	const roomId = $page.params.roomId;

	let activePanel = $state<'chat' | 'alerts' | 'members'>('chat');
	let showMobileMenu = $state(false);

	// Redirect if not authenticated
	$effect(() => {
		if (!authStore.isLoading && !authStore.isAuthenticated) {
			goto('/auth/login');
		}
	});

	// Fetch room data and subscribe to realtime
	$effect(() => {
		if (authStore.isAuthenticated && roomId) {
			roomStore.fetchRoom(roomId).then((room) => {
				if (room) {
					roomStore.subscribeToRoom(roomId);
				} else {
					toastStore.error('Room not found');
					goto('/rooms');
				}
			});
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		roomStore.unsubscribeFromRoom();
		roomStore.reset();
	});
</script>

<div class="flex h-screen flex-col bg-surface-900">
	<!-- Header -->
	<header class="sticky top-0 z-50 flex items-center justify-between border-b border-surface-700 bg-surface-900/95 px-4 py-3 backdrop-blur lg:px-6">
		<div class="flex items-center gap-4">
			<a
				href="/rooms"
				class="flex items-center gap-2 rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition"
			>
				<ArrowLeft class="h-5 w-5" />
				<span class="hidden sm:inline">Back</span>
			</a>

			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
					{#if roomStore.currentRoom?.iconUrl}
						<img src={roomStore.currentRoom.iconUrl} alt="" class="h-6 w-6 rounded" />
					{:else}
						<TrendingUp class="h-5 w-5 text-primary-400" />
					{/if}
				</div>
				<div>
					<h1 class="font-semibold">{roomStore.currentRoom?.title || 'Loading...'}</h1>
					<p class="text-xs text-surface-400">
						{roomStore.members.length} members
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Desktop Panel Switcher -->
			<div class="hidden lg:flex items-center rounded-lg border border-surface-600 p-1">
				<button
					onclick={() => (activePanel = 'chat')}
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'chat' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}"
				>
					<MessageSquare class="h-4 w-4" />
					Chat
				</button>
				<button
					onclick={() => (activePanel = 'alerts')}
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'alerts' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}"
				>
					<Bell class="h-4 w-4" />
					Alerts
					{#if roomStore.alerts.length > 0}
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
							{roomStore.alerts.length > 9 ? '9+' : roomStore.alerts.length}
						</span>
					{/if}
				</button>
				<button
					onclick={() => (activePanel = 'members')}
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'members' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}"
				>
					<Users class="h-4 w-4" />
					Members
				</button>
			</div>

			<!-- Settings -->
			<button class="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
				<Settings class="h-5 w-5" />
			</button>

			<!-- Mobile Menu Toggle -->
			<button
				onclick={() => (showMobileMenu = !showMobileMenu)}
				class="lg:hidden rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition"
			>
				{#if showMobileMenu}
					<X class="h-5 w-5" />
				{:else}
					<Menu class="h-5 w-5" />
				{/if}
			</button>
		</div>
	</header>

	<!-- Mobile Menu -->
	{#if showMobileMenu}
		<div class="lg:hidden border-b border-surface-700 bg-surface-800 px-4 py-3">
			<div class="flex gap-2">
				<button
					onclick={() => { activePanel = 'chat'; showMobileMenu = false; }}
					class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition {activePanel === 'chat' ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
				>
					<MessageSquare class="h-4 w-4" />
					Chat
				</button>
				<button
					onclick={() => { activePanel = 'alerts'; showMobileMenu = false; }}
					class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition {activePanel === 'alerts' ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
				>
					<Bell class="h-4 w-4" />
					Alerts
				</button>
				<button
					onclick={() => { activePanel = 'members'; showMobileMenu = false; }}
					class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition {activePanel === 'members' ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
				>
					<Users class="h-4 w-4" />
					Members
				</button>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Chat/Main Panel -->
		<div class="flex-1 flex flex-col overflow-hidden {activePanel !== 'chat' ? 'hidden lg:flex' : ''}">
			{#if activePanel === 'chat' || window.innerWidth >= 1024}
				<ChatPanel />
			{/if}
		</div>

		<!-- Alerts Panel (Desktop: Sidebar, Mobile: Full) -->
		{#if activePanel === 'alerts'}
			<div class="flex-1 lg:w-96 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<AlertsPanel />
			</div>
		{/if}

		<!-- Members Panel (Desktop: Sidebar, Mobile: Full) -->
		{#if activePanel === 'members'}
			<div class="flex-1 lg:w-80 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<MembersPanel />
			</div>
		{/if}
	</div>
</div>
