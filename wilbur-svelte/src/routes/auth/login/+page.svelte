<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, toastStore } from '$lib/stores';
	import { Envelope, Lock, Eye, EyeSlash, TrendUp } from 'phosphor-svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		const success = await authStore.login(email, password);

		if (success) {
			toastStore.success('Welcome back!', 'Login successful');
			goto('/rooms');
		} else {
			toastStore.error(authStore.error || 'Login failed');
		}

		isSubmitting = false;
	}
</script>

<div class="min-h-screen flex">
	<!-- Left Panel - Form -->
	<div class="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
		<div class="mx-auto w-full max-w-md">
			<a href="/" class="flex items-center gap-2 text-surface-400 hover:text-white transition mb-8">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
					<TrendUp class="h-6 w-6 text-white" weight="bold" />
				</div>
				<span class="text-xl font-bold text-white">Wilbur</span>
			</a>

			<h1 class="text-3xl font-bold">Welcome back</h1>
			<p class="mt-2 text-surface-400">Sign in to your account to continue</p>

			<form onsubmit={handleSubmit} class="mt-8 space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-surface-300">
						Email address
					</label>
					<div class="relative mt-2">
						<Envelope class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full rounded-lg border border-surface-600 bg-surface-800 py-3 pl-10 pr-4 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="you@example.com"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-surface-300">
						Password
					</label>
					<div class="relative mt-2">
						<Lock class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							class="w-full rounded-lg border border-surface-600 bg-surface-800 py-3 pl-10 pr-12 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="Enter your password"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
						>
							{#if showPassword}
								<EyeSlash class="h-5 w-5" />
							{:else}
								<Eye class="h-5 w-5" />
							{/if}
						</button>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
						/>
						<span class="text-sm text-surface-400">Remember me</span>
					</label>
					<a href="/auth/forgot-password" class="text-sm text-primary-400 hover:text-primary-300">
						Forgot password?
					</a>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full rounded-lg bg-primary-500 py-3 font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? 'Signing in...' : 'Sign in'}
				</button>
			</form>

			<p class="mt-8 text-center text-surface-400">
				Don't have an account?
				<a href="/auth/register" class="text-primary-400 hover:text-primary-300 font-medium">
					Sign up
				</a>
			</p>
		</div>
	</div>

	<!-- Right Panel - Branding -->
	<div class="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-primary-900/30 via-surface-900 to-surface-950">
		<div class="max-w-lg text-center px-12">
			<div class="flex justify-center mb-8">
				<div class="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-500/20 backdrop-blur">
					<TrendUp class="h-12 w-12 text-primary-400" weight="duotone" />
				</div>
			</div>
			<h2 class="text-3xl font-bold">Trade together, grow together</h2>
			<p class="mt-4 text-surface-400">
				Join thousands of traders sharing alerts, insights, and strategies in real-time.
				Built with Svelte 5 and edge-first architecture for blazing fast performance.
			</p>
		</div>
	</div>
</div>
