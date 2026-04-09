<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores';
	import { ArrowLeftIcon } from 'phosphor-svelte';
	import ThemeSettings from '$lib/components/settings/ThemeSettings.svelte';
	import BrandingSettings from '$lib/components/settings/BrandingSettings.svelte';
	import IntegrationsPanel from '$lib/components/settings/IntegrationsPanel.svelte';

	type SettingsTab = 'theme' | 'branding' | 'integrations';
	let activeTab = $state<SettingsTab>('theme');

	const isAdmin = $derived(authStore.user?.role === 'admin' || authStore.user?.role === 'host');

	$effect(() => {
		if (!authStore.isLoading && !authStore.isAuthenticated) goto('/auth/login');
	});
</script>

<div class="flex h-screen flex-col bg-surface-900">
	<header class="flex items-center gap-4 border-b border-surface-700 px-4 py-3">
		<button onclick={() => history.back()} class="flex items-center gap-2 rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-white transition">
			<ArrowLeftIcon class="h-5 w-5" />
			<span>Back</span>
		</button>
		<h1 class="font-semibold text-lg">Settings</h1>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<nav class="w-52 border-r border-surface-700 p-3 flex flex-col gap-1">
			<button onclick={() => activeTab = 'theme'} class="text-left rounded-lg px-3 py-2 text-sm transition {activeTab === 'theme' ? 'bg-primary-500/20 text-primary-400' : 'text-surface-400 hover:bg-surface-800'}">
				🎨 Theme
			</button>
			{#if isAdmin}
				<button onclick={() => activeTab = 'branding'} class="text-left rounded-lg px-3 py-2 text-sm transition {activeTab === 'branding' ? 'bg-primary-500/20 text-primary-400' : 'text-surface-400 hover:bg-surface-800'}">
					🏢 Branding
				</button>
			{/if}
			<button onclick={() => activeTab = 'integrations'} class="text-left rounded-lg px-3 py-2 text-sm transition {activeTab === 'integrations' ? 'bg-primary-500/20 text-primary-400' : 'text-surface-400 hover:bg-surface-800'}">
				🔌 Integrations
			</button>
		</nav>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			{#if activeTab === 'theme'}
				<ThemeSettings />
			{:else if activeTab === 'branding'}
				<BrandingSettings />
			{:else if activeTab === 'integrations'}
				<IntegrationsPanel />
			{/if}
		</div>
	</div>
</div>
