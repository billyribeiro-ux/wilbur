<script lang="ts">
	import { roomStore, authStore, toastStore } from '$lib/stores';
	import { Bell, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle, X } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';

	let showCreateModal = $state(false);
	let alertTitle = $state('');
	let alertBody = $state('');
	let alertType = $state<'text' | 'url' | 'media'>('text');
	let isNonTrade = $state(false);
	let hasLegalDisclosure = $state(false);
	let legalDisclosureText = $state('');
	let isSubmitting = $state(false);

	async function handleCreateAlert(e: Event) {
		e.preventDefault();
		if (!alertBody.trim() || isSubmitting) return;

		isSubmitting = true;

		const success = await roomStore.createAlert({
			title: alertTitle.trim() || undefined,
			body: alertBody.trim(),
			type: alertType,
			isNonTrade,
			hasLegalDisclosure,
			legalDisclosureText: hasLegalDisclosure ? legalDisclosureText : undefined
		});

		if (success) {
			toastStore.success('Alert posted!');
			resetForm();
			showCreateModal = false;
		} else {
			toastStore.error('Failed to post alert');
		}

		isSubmitting = false;
	}

	function resetForm() {
		alertTitle = '';
		alertBody = '';
		alertType = 'text';
		isNonTrade = false;
		hasLegalDisclosure = false;
		legalDisclosureText = '';
	}

	function formatTime(dateString: string): string {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true });
	}

	function getAlertIcon(body: string) {
		const lowerBody = body?.toLowerCase() || '';
		if (lowerBody.includes('buy') || lowerBody.includes('long') || lowerBody.includes('bullish')) {
			return { icon: TrendingUp, class: 'text-green-400 bg-green-500/20' };
		}
		if (lowerBody.includes('sell') || lowerBody.includes('short') || lowerBody.includes('bearish')) {
			return { icon: TrendingDown, class: 'text-red-400 bg-red-500/20' };
		}
		return { icon: Minus, class: 'text-yellow-400 bg-yellow-500/20' };
	}

	function canPostAlerts(): boolean {
		const role = authStore.user?.role;
		return role === 'admin' || role === 'host' || role === 'moderator';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-surface-700 px-4 py-3">
		<div class="flex items-center gap-2">
			<Bell class="h-5 w-5 text-primary-400" />
			<h2 class="font-semibold">Trading Alerts</h2>
			<span class="rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
				{roomStore.alerts.length}
			</span>
		</div>

		{#if canPostAlerts()}
			<button
				onclick={() => (showCreateModal = true)}
				class="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition"
			>
				<Plus class="h-4 w-4" />
				Post Alert
			</button>
		{/if}
	</div>

	<!-- Alerts List -->
	<div class="flex-1 overflow-y-auto p-4 space-y-4">
		{#if roomStore.alerts.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="rounded-full bg-surface-800 p-4">
					<Bell class="h-8 w-8 text-surface-500" />
				</div>
				<h3 class="mt-4 font-medium">No alerts yet</h3>
				<p class="mt-1 text-sm text-surface-400">
					{canPostAlerts() ? 'Post your first trading alert' : 'Alerts will appear here'}
				</p>
			</div>
		{:else}
			{#each roomStore.alerts as alert}
				{@const alertStyle = getAlertIcon(alert.body || '')}
				<div class="rounded-xl border border-surface-700 bg-surface-800/50 p-4 alert-pulse">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg {alertStyle.class}">
							<alertStyle.icon class="h-5 w-5" />
						</div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="font-medium text-surface-200">
										{alert.author?.displayName || 'Unknown'}
									</span>
									{#if alert.isNonTrade}
										<span class="rounded bg-surface-700 px-1.5 py-0.5 text-xs text-surface-400">
											Non-trade
										</span>
									{/if}
								</div>
								<span class="text-xs text-surface-500">{formatTime(alert.createdAt)}</span>
							</div>

							{#if alert.title}
								<h3 class="mt-1 font-semibold text-white">{alert.title}</h3>
							{/if}

							{#if alert.body}
								<p class="mt-1 text-surface-300 whitespace-pre-wrap">{alert.body}</p>
							{/if}

							{#if alert.hasLegalDisclosure && alert.legalDisclosureText}
								<div class="mt-3 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm">
									<AlertTriangle class="h-4 w-4 flex-shrink-0 text-yellow-400 mt-0.5" />
									<p class="text-yellow-300">{alert.legalDisclosureText}</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Create Alert Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
		<div class="w-full max-w-lg rounded-2xl border border-surface-700 bg-surface-800 shadow-xl">
			<div class="flex items-center justify-between border-b border-surface-700 px-6 py-4">
				<h2 class="text-lg font-semibold">Post Trading Alert</h2>
				<button
					onclick={() => { showCreateModal = false; resetForm(); }}
					class="rounded-lg p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={handleCreateAlert} class="p-6 space-y-4">
				<div>
					<label for="alertTitle" class="block text-sm font-medium text-surface-300 mb-2">
						Title (optional)
					</label>
					<input
						id="alertTitle"
						type="text"
						bind:value={alertTitle}
						placeholder="e.g., AAPL Entry Signal"
						class="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="alertBody" class="block text-sm font-medium text-surface-300 mb-2">
						Alert Content *
					</label>
					<textarea
						id="alertBody"
						bind:value={alertBody}
						required
						rows="4"
						placeholder="Enter your trading alert..."
						class="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none resize-none"
					></textarea>
				</div>

				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={isNonTrade}
							class="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-500 focus:ring-primary-500"
						/>
						<span class="text-sm text-surface-300">Non-trade alert</span>
					</label>

					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={hasLegalDisclosure}
							class="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-500 focus:ring-primary-500"
						/>
						<span class="text-sm text-surface-300">Add disclosure</span>
					</label>
				</div>

				{#if hasLegalDisclosure}
					<div>
						<label for="legalDisclosure" class="block text-sm font-medium text-surface-300 mb-2">
							Legal Disclosure
						</label>
						<textarea
							id="legalDisclosure"
							bind:value={legalDisclosureText}
							rows="2"
							placeholder="e.g., I have a position in this stock..."
							class="w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none resize-none"
						></textarea>
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={() => { showCreateModal = false; resetForm(); }}
						class="flex-1 rounded-lg border border-surface-600 px-4 py-3 font-medium text-surface-300 hover:bg-surface-700 transition"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!alertBody.trim() || isSubmitting}
						class="flex-1 rounded-lg bg-primary-500 px-4 py-3 font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
					>
						{isSubmitting ? 'Posting...' : 'Post Alert'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
