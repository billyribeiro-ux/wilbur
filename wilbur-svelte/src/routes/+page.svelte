<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, roomStore } from '$lib/stores';
	import { TrendUp, Users, Bell, Shield, Lightning, ChatCircle } from 'phosphor-svelte';

	// Fetch rooms on mount
	$effect(() => {
		if (authStore.isAuthenticated) {
			roomStore.fetchRooms();
		}
	});

	function handleGetStarted() {
		if (authStore.isAuthenticated) {
			goto('/rooms');
		} else {
			goto('/auth/login');
		}
	}

	const features = [
		{
			icon: ChatCircle,
			title: 'Real-time Chat',
			description: 'Instant messaging with support for images, files, and rich text'
		},
		{
			icon: Bell,
			title: 'Trading Alerts',
			description: 'Broadcast alerts with legal disclosures and multimedia support'
		},
		{
			icon: Users,
			title: 'Community Rooms',
			description: 'Create and join trading rooms with role-based access control'
		},
		{
			icon: Shield,
			title: 'Moderation Tools',
			description: 'Full suite of moderation features including bans, mutes, and reports'
		},
		{
			icon: TrendUp,
			title: 'Edge Performance',
			description: 'Global edge database for sub-10ms response times worldwide'
		},
		{
			icon: Lightning,
			title: 'Svelte 5 Powered',
			description: 'Built with Svelte 5 Runes for blazing fast reactivity'
		}
	];
</script>

<div class="min-h-screen">
	<!-- Hero Section -->
	<header class="relative overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-surface-900 to-surface-950"></div>
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>

		<nav class="relative z-10 px-6 py-4">
			<div class="mx-auto flex max-w-7xl items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
						<TrendUp class="h-6 w-6 text-white" weight="bold" />
					</div>
					<span class="text-xl font-bold">Wilbur</span>
				</div>

				<div class="flex items-center gap-4">
					{#if authStore.isAuthenticated}
						<a href="/rooms" class="rounded-lg px-4 py-2 text-surface-300 hover:text-white transition">
							Rooms
						</a>
						<button
							onclick={() => authStore.logout()}
							class="rounded-lg border border-surface-600 px-4 py-2 hover:bg-surface-800 transition"
						>
							Sign Out
						</button>
					{:else}
						<a href="/auth/login" class="rounded-lg px-4 py-2 text-surface-300 hover:text-white transition">
							Sign In
						</a>
						<a
							href="/auth/register"
							class="rounded-lg bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 transition"
						>
							Get Started
						</a>
					{/if}
				</div>
			</div>
		</nav>

		<div class="relative z-10 mx-auto max-w-7xl px-6 py-24 text-center">
			<h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
				<span class="text-white">Trading Rooms</span>
				<br />
				<span class="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
					Reimagined
				</span>
			</h1>

			<p class="mx-auto mt-6 max-w-2xl text-lg text-surface-300">
				Real-time collaboration for traders. Share alerts, chat, and stream together.
				Built with Svelte 5, Pocketbase, and Turso for global edge performance.
			</p>

			<div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<button
					onclick={handleGetStarted}
					class="rounded-xl bg-primary-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition"
				>
					{authStore.isAuthenticated ? 'Go to Rooms' : 'Get Started Free'}
				</button>
				<a
					href="#features"
					class="rounded-xl border border-surface-600 px-8 py-4 text-lg font-semibold hover:bg-surface-800 transition"
				>
					Learn More
				</a>
			</div>
		</div>
	</header>

	<!-- Features Section -->
	<section id="features" class="py-24 px-6">
		<div class="mx-auto max-w-7xl">
			<div class="text-center">
				<h2 class="text-3xl font-bold sm:text-4xl">Everything you need to trade together</h2>
				<p class="mt-4 text-surface-400">
					A complete platform for trading communities, built from the ground up.
				</p>
			</div>

			<div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{#each features as feature}
					<div class="rounded-2xl border border-surface-700 bg-surface-800/50 p-8 backdrop-blur transition hover:border-surface-600 hover:bg-surface-800">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400">
							<feature.icon class="h-6 w-6" />
						</div>
						<h3 class="mt-4 text-xl font-semibold">{feature.title}</h3>
						<p class="mt-2 text-surface-400">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Tech Stack Section -->
	<section class="border-t border-surface-800 py-24 px-6">
		<div class="mx-auto max-w-7xl text-center">
			<h2 class="text-3xl font-bold">Powered by Modern Tech</h2>
			<p class="mt-4 text-surface-400">Built with the latest and greatest December 2025 stack</p>

			<div class="mt-12 flex flex-wrap justify-center gap-8">
				<div class="flex flex-col items-center gap-2">
					<div class="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-500/10">
						<span class="text-2xl">🔥</span>
					</div>
					<span class="font-medium">Svelte 5</span>
					<span class="text-sm text-surface-500">Runes</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<div class="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/10">
						<span class="text-2xl">📦</span>
					</div>
					<span class="font-medium">Pocketbase</span>
					<span class="text-sm text-surface-500">v0.23</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<div class="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500/10">
						<span class="text-2xl">🚀</span>
					</div>
					<span class="font-medium">Turso</span>
					<span class="text-sm text-surface-500">Edge SQLite</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<div class="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-500/10">
						<span class="text-2xl">🎬</span>
					</div>
					<span class="font-medium">LiveKit</span>
					<span class="text-sm text-surface-500">Coming Soon</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<div class="flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-500/10">
						<span class="text-2xl">🎨</span>
					</div>
					<span class="font-medium">Skeleton</span>
					<span class="text-sm text-surface-500">v3.0</span>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="border-t border-surface-800 py-24 px-6">
		<div class="mx-auto max-w-3xl text-center">
			<h2 class="text-3xl font-bold sm:text-4xl">Ready to start trading together?</h2>
			<p class="mt-4 text-surface-400">
				Join thousands of traders already using Wilbur for real-time collaboration.
			</p>
			<button
				onclick={handleGetStarted}
				class="mt-8 rounded-xl bg-primary-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition"
			>
				{authStore.isAuthenticated ? 'Go to Rooms' : 'Create Free Account'}
			</button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-surface-800 py-12 px-6">
		<div class="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
					<TrendUp class="h-4 w-4 text-white" weight="bold" />
				</div>
				<span class="font-semibold">Wilbur Trading Room</span>
			</div>
			<p class="text-sm text-surface-500">
				&copy; 2025 Wilbur. Built with Svelte 5, Pocketbase & Turso.
			</p>
		</div>
	</footer>
</div>
