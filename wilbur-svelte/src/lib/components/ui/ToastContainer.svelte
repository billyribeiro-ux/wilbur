<script lang="ts">
	import { toastStore, type Toast } from '$lib/stores';
	import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return { icon: CheckCircle, class: 'text-green-400' };
			case 'error':
				return { icon: AlertCircle, class: 'text-red-400' };
			case 'warning':
				return { icon: AlertTriangle, class: 'text-yellow-400' };
			case 'info':
			default:
				return { icon: Info, class: 'text-blue-400' };
		}
	}

	function getBgClass(type: Toast['type']): string {
		switch (type) {
			case 'success':
				return 'bg-green-500/10 border-green-500/30';
			case 'error':
				return 'bg-red-500/10 border-red-500/30';
			case 'warning':
				return 'bg-yellow-500/10 border-yellow-500/30';
			case 'info':
			default:
				return 'bg-blue-500/10 border-blue-500/30';
		}
	}
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
	{#each toastStore.toasts as toast (toast.id)}
		{@const iconStyle = getIcon(toast.type)}
		<div
			class="pointer-events-auto flex items-start gap-3 rounded-xl border {getBgClass(toast.type)} bg-surface-800 p-4 shadow-xl backdrop-blur max-w-sm"
			in:fly={{ x: 100, duration: 200 }}
			out:fly={{ x: 100, duration: 150 }}
		>
			<div class="flex-shrink-0">
				<iconStyle.icon class="h-5 w-5 {iconStyle.class}" />
			</div>

			<div class="flex-1 min-w-0">
				{#if toast.title}
					<h4 class="font-medium text-white">{toast.title}</h4>
				{/if}
				<p class="text-sm text-surface-300 {toast.title ? 'mt-0.5' : ''}">{toast.message}</p>
			</div>

			{#if toast.dismissible}
				<button
					onclick={() => toastStore.dismiss(toast.id)}
					class="flex-shrink-0 rounded-lg p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>
	{/each}
</div>
