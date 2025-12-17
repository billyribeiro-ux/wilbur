<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, roomStore, toastStore } from '$lib/stores';
	import { Plus, MagnifyingGlass, Users, ChatCircle, Bell, Gear, SignOut, TrendUp, User } from 'phosphor-svelte';
	import CreateRoomModal from '$lib/components/rooms/CreateRoomModal.svelte';

	let searchQuery = $state('');
	let showCreateModal = $state(false);

	// Redirect if not authenticated
	$effect(() => {
		if (!authStore.isLoading && !authStore.isAuthenticated) {
			goto('/auth/login');
		}
	});

	// Fetch rooms on mount
	$effect(() => {
		if (authStore.isAuthenticated) {
			roomStore.fetchRooms();
		}
	});

	// Filtered rooms based on search
	const filteredRooms = $derived(
		searchQuery
			? roomStore.rooms.filter(
					(room) =>
						room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						room.description?.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: roomStore.rooms
	);

	function handleJoinRoom(roomId: string) {
		goto(`/rooms/${roomId}`);
	}

	async function handleLogout() {
		await authStore.logout();
		toastStore.success('See you later!', 'Logged out successfully');
		goto('/');
	}
</script>

<div class="min-h-screen bg-surface-900">
	<!-- Header -->
	<header class="sticky top-0 z-50 border-b border-surface-700 bg-surface-900/95 backdrop-blur">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<div class="flex items-center gap-4">
				<a href="/" class="flex items-center gap-2">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
						<TrendUp class="h-6 w-6 text-white" weight="bold" />
					</div>
					<span class="text-xl font-bold">Wilbur</span>
				</a>
			</div>

			<div class="flex items-center gap-4">
				<!-- Search -->
				<div class="relative hidden sm:block">
					<MagnifyingGlass class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search rooms..."
						class="w-64 rounded-lg border border-surface-600 bg-surface-800 py-2 pl-9 pr-4 text-sm placeholder-surface-500 focus:border-primary-500 focus:outline-none"
					/>
				</div>

				<!-- Create Room Button -->
				<button
					onclick={() => (showCreateModal = true)}
					class="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition"
				>
					<Plus class="h-4 w-4" />
					<span class="hidden sm:inline">New Room</span>
				</button>

				<!-- User Menu -->
				<div class="relative group">
					<button class="flex items-center gap-2 rounded-lg border border-surface-600 px-3 py-2 hover:bg-surface-800 transition">
						<div class="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center">
							<User class="h-4 w-4 text-primary-400" />
						</div>
						<span class="hidden sm:inline text-sm">{authStore.user?.displayName || 'User'}</span>
					</button>

					<div class="absolute right-0 mt-2 w-48 rounded-lg border border-surface-600 bg-surface-800 py-1 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
						<a href="/settings" class="flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700">
							<Gear class="h-4 w-4" />
							Settings
						</a>
						<button
							onclick={handleLogout}
							class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-surface-700"
						>
							<SignOut class="h-4 w-4" />
							Sign out
						</button>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-6 py-8">
		<div class="mb-8">
			<h1 class="text-3xl font-bold">Trading Rooms</h1>
			<p class="mt-2 text-surface-400">Join a room to start collaborating with other traders</p>
		</div>

		<!-- Mobile Search -->
		<div class="mb-6 sm:hidden">
			<div class="relative">
				<MagnifyingGlass class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search rooms..."
					class="w-full rounded-lg border border-surface-600 bg-surface-800 py-2 pl-9 pr-4 text-sm placeholder-surface-500 focus:border-primary-500 focus:outline-none"
				/>
			</div>
		</div>

		{#if roomStore.isLoading}
			<!-- Loading State -->
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="animate-pulse rounded-2xl border border-surface-700 bg-surface-800 p-6">
						<div class="h-12 w-12 rounded-xl bg-surface-700"></div>
						<div class="mt-4 h-6 w-3/4 rounded bg-surface-700"></div>
						<div class="mt-2 h-4 w-full rounded bg-surface-700"></div>
						<div class="mt-4 flex gap-4">
							<div class="h-4 w-20 rounded bg-surface-700"></div>
							<div class="h-4 w-20 rounded bg-surface-700"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredRooms.length === 0}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<div class="flex h-20 w-20 items-center justify-center rounded-full bg-surface-800">
					<ChatCircle class="h-10 w-10 text-surface-500" />
				</div>
				<h3 class="mt-4 text-xl font-semibold">No rooms found</h3>
				<p class="mt-2 text-surface-400">
					{searchQuery ? 'Try adjusting your search query' : 'Create your first room to get started'}
				</p>
				{#if !searchQuery}
					<button
						onclick={() => (showCreateModal = true)}
						class="mt-6 flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600 transition"
					>
						<Plus class="h-5 w-5" />
						Create Room
					</button>
				{/if}
			</div>
		{:else}
			<!-- Room Grid -->
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredRooms as room}
					<button
						onclick={() => handleJoinRoom(room.id)}
						class="room-card group rounded-2xl border border-surface-700 bg-surface-800/50 p-6 text-left hover:border-surface-600 hover:bg-surface-800"
					>
						<div class="flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-xl"
								style="background-color: {room.branding?.iconBgColor || 'rgb(59 130 246 / 0.2)'}"
							>
								{#if room.iconUrl}
									<img src={room.iconUrl} alt={room.name} class="h-8 w-8 rounded" />
								{:else}
									<TrendUp class="h-6 w-6 text-primary-400" weight="duotone" />
								{/if}
							</div>
							<div class="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
								<span class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
								Live
							</div>
						</div>

						<h3 class="mt-4 text-lg font-semibold group-hover:text-primary-400 transition">
							{room.title}
						</h3>
						{#if room.description}
							<p class="mt-1 line-clamp-2 text-sm text-surface-400">
								{room.description}
							</p>
						{/if}

						<div class="mt-4 flex items-center gap-4 text-sm text-surface-500">
							<div class="flex items-center gap-1">
								<Users class="h-4 w-4" />
								<span>{room.memberCount || 0} members</span>
							</div>
							<div class="flex items-center gap-1">
								<Bell class="h-4 w-4" />
								<span>Active</span>
							</div>
						</div>

						{#if room.tags && room.tags.length > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each room.tags.slice(0, 3) as tag}
									<span class="rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
										{tag}
									</span>
								{/each}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showCreateModal}
	<CreateRoomModal onclose={() => (showCreateModal = false)} />
{/if}
