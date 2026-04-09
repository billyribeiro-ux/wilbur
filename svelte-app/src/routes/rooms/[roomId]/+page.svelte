<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { authStore, roomStore, toastStore, notificationStore, privateChatStore } from '$lib/stores';
	import { ArrowLeftIcon, UsersIcon, BellIcon, GearIcon, ChatCircleIcon, TrendUpIcon, ListIcon, XIcon, ChartBarIcon, PencilSimpleIcon, ChatDotsIcon, MonitorIcon, NotePencilIcon } from 'phosphor-svelte';
	import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
	import AlertsPanel from '$lib/components/alerts/AlertsPanel.svelte';
	import MembersPanel from '$lib/components/rooms/MembersPanel.svelte';
	import PollsPanel from '$lib/components/polls/PollsPanel.svelte';
	import PrivateChatList from '$lib/components/private-chat/PrivateChatList.svelte';
	import PrivateChatConversation from '$lib/components/private-chat/PrivateChatConversation.svelte';
	import AudioControls from '$lib/components/media/AudioControls.svelte';
	import RecordingControls from '$lib/components/media/RecordingControls.svelte';
	import NotificationPanel from '$lib/components/notifications/NotificationPanel.svelte';
	import NotesPanel from '$lib/components/notes/NotesPanel.svelte';

	// Get room ID from URL
	const roomId = page.params.roomId;

	type PanelType = 'chat' | 'alerts' | 'members' | 'polls' | 'dms' | 'notes';
	let activePanel = $state<PanelType>('chat');
	let showMobileMenu = $state(false);
	const isAdmin = $derived(authStore.user?.role === 'admin' || authStore.user?.role === 'host');

	function setPanel(id: string) { activePanel = id as PanelType; showMobileMenu = false; }

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
				<ArrowLeftIcon class="h-5 w-5" />
				<span class="hidden sm:inline">Back</span>
			</a>

			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
					{#if roomStore.currentRoom?.iconUrl}
						<img src={roomStore.currentRoom.iconUrl} alt="" class="h-6 w-6 rounded" />
					{:else}
						<TrendUpIcon class="h-5 w-5 text-primary-400" weight="duotone" />
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
				<button onclick={() => (activePanel = 'chat')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'chat' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<ChatCircleIcon class="h-4 w-4" /> Chat
				</button>
				<button onclick={() => (activePanel = 'alerts')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'alerts' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<BellIcon class="h-4 w-4" /> Alerts
					{#if roomStore.alerts.length > 0}
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{roomStore.alerts.length > 9 ? '9+' : roomStore.alerts.length}</span>
					{/if}
				</button>
				<button onclick={() => (activePanel = 'polls')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'polls' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<ChartBarIcon class="h-4 w-4" /> Polls
				</button>
				<button onclick={() => (activePanel = 'members')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'members' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<UsersIcon class="h-4 w-4" /> Members
				</button>
				<button onclick={() => (activePanel = 'dms')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'dms' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<ChatDotsIcon class="h-4 w-4" /> DMs
				</button>
				<button onclick={() => (activePanel = 'notes')} class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition {activePanel === 'notes' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}">
					<NotePencilIcon class="h-4 w-4" /> Notes
				</button>
			</div>

			<!-- Whiteboard Link -->
			<a href="/rooms/{roomId}/whiteboard" class="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition" title="Whiteboard">
				<PencilSimpleIcon class="h-5 w-5" />
			</a>

			<!-- Notification Bell -->
			<button onclick={() => notificationStore.toggle()} class="relative rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
				<BellIcon class="h-5 w-5" />
				{#if notificationStore.hasUnread}
					<span class="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{notificationStore.unreadCount}</span>
				{/if}
			</button>

			<!-- Settings -->
			<a href="/settings" class="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
				<GearIcon class="h-5 w-5" />
			</a>

			<!-- Mobile Menu Toggle -->
			<button onclick={() => (showMobileMenu = !showMobileMenu)} class="lg:hidden rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
				{#if showMobileMenu}<XIcon class="h-5 w-5" />{:else}<ListIcon class="h-5 w-5" />{/if}
			</button>
		</div>
	</header>

	<!-- Notification Panel -->
	<NotificationPanel />

	<!-- Mobile Menu -->
	{#if showMobileMenu}
		<div class="lg:hidden border-b border-surface-700 bg-surface-800 px-4 py-3">
			<div class="flex flex-wrap gap-2">
				{#each [
					{ id: 'chat', label: 'Chat', Icon: ChatCircleIcon },
					{ id: 'alerts', label: 'Alerts', Icon: BellIcon },
					{ id: 'polls', label: 'Polls', Icon: ChartBarIcon },
					{ id: 'members', label: 'Members', Icon: UsersIcon },
					{ id: 'dms', label: 'DMs', Icon: ChatDotsIcon },
					{ id: 'notes', label: 'Notes', Icon: NotePencilIcon },
				] as item (item.id)}
					<button
						onclick={() => setPanel(item.id)}
						class="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm transition min-w-[80px] {activePanel === item.id ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
					>
						<item.Icon class="h-4 w-4" /> {item.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Media Controls Bar -->
	<div class="flex items-center gap-3 border-b border-surface-700 bg-surface-900/80 px-4 py-2">
		<AudioControls />
		{#if isAdmin}
			<RecordingControls />
		{/if}
		<div class="ml-auto flex items-center gap-2">
			<a href="/rooms/{roomId}/whiteboard" class="flex items-center gap-1 rounded-lg border border-surface-600 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-white transition">
				<PencilSimpleIcon class="h-4 w-4" /> Whiteboard
			</a>
			<button onclick={() => goto('/rooms/' + roomId + '/screenshare')} class="flex items-center gap-1 rounded-lg border border-surface-600 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-white transition">
				<MonitorIcon class="h-4 w-4" /> Share
			</button>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Chat/Main Panel -->
		<div class="flex-1 flex flex-col overflow-hidden {activePanel !== 'chat' ? 'hidden lg:flex' : ''}">
			<ChatPanel />
		</div>

		<!-- Right Sidebar Panels -->
		{#if activePanel === 'alerts'}
			<div class="flex-1 lg:w-96 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<AlertsPanel />
			</div>
		{:else if activePanel === 'polls'}
			<div class="flex-1 lg:w-96 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<PollsPanel {isAdmin} />
			</div>
		{:else if activePanel === 'members'}
			<div class="flex-1 lg:w-80 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<MembersPanel />
			</div>
		{:else if activePanel === 'dms'}
			<div class="flex-1 lg:w-96 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				{#if privateChatStore.activeChat}
					<PrivateChatConversation />
				{:else}
					<PrivateChatList />
				{/if}
			</div>
		{:else if activePanel === 'notes'}
			<div class="flex-1 lg:w-96 lg:flex-none lg:border-l lg:border-surface-700 overflow-hidden">
				<NotesPanel />
			</div>
		{/if}
	</div>
</div>
