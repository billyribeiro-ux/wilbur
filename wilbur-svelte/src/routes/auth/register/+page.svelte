<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, toastStore } from '$lib/stores';
	import { Envelope, Lock, Eye, EyeSlash, User, TrendUp } from 'phosphor-svelte';

	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let displayName = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		errors = {};

		if (!displayName.trim()) {
			errors.displayName = 'Display name is required';
		} else if (displayName.length < 2) {
			errors.displayName = 'Display name must be at least 2 characters';
		}

		if (!email.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Please enter a valid email address';
		}

		if (!password) {
			errors.password = 'Password is required';
		} else if (password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}

		if (password !== passwordConfirm) {
			errors.passwordConfirm = 'Passwords do not match';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validate()) return;

		isSubmitting = true;

		const success = await authStore.register(email, password, passwordConfirm, displayName);

		if (success) {
			toastStore.success('Welcome to Wilbur!', 'Account created successfully');
			goto('/rooms');
		} else {
			toastStore.error(authStore.error || 'Registration failed');
		}

		isSubmitting = false;
	}
</script>

<div class="min-h-screen flex">
	<!-- Left Panel - Branding -->
	<div class="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-primary-900/30 via-surface-900 to-surface-950">
		<div class="max-w-lg text-center px-12">
			<div class="flex justify-center mb-8">
				<div class="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-500/20 backdrop-blur">
					<TrendUp class="h-12 w-12 text-primary-400" weight="duotone" />
				</div>
			</div>
			<h2 class="text-3xl font-bold">Start your trading journey</h2>
			<p class="mt-4 text-surface-400">
				Create your free account and join the community. Share alerts, collaborate in rooms,
				and trade together with real-time communication.
			</p>
			<div class="mt-8 flex justify-center gap-4">
				<div class="rounded-lg bg-surface-800/50 px-4 py-2 text-sm">
					<span class="text-primary-400">Free</span> to start
				</div>
				<div class="rounded-lg bg-surface-800/50 px-4 py-2 text-sm">
					<span class="text-primary-400">Unlimited</span> rooms
				</div>
				<div class="rounded-lg bg-surface-800/50 px-4 py-2 text-sm">
					<span class="text-primary-400">Real-time</span> chat
				</div>
			</div>
		</div>
	</div>

	<!-- Right Panel - Form -->
	<div class="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
		<div class="mx-auto w-full max-w-md">
			<a href="/" class="flex items-center gap-2 text-surface-400 hover:text-white transition mb-8">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
					<TrendUp class="h-6 w-6 text-white" weight="bold" />
				</div>
				<span class="text-xl font-bold text-white">Wilbur</span>
			</a>

			<h1 class="text-3xl font-bold">Create your account</h1>
			<p class="mt-2 text-surface-400">Start trading together in minutes</p>

			<form onsubmit={handleSubmit} class="mt-8 space-y-5">
				<div>
					<label for="displayName" class="block text-sm font-medium text-surface-300">
						Display name
					</label>
					<div class="relative mt-2">
						<User class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
						<input
							id="displayName"
							type="text"
							bind:value={displayName}
							required
							class="w-full rounded-lg border {errors.displayName ? 'border-red-500' : 'border-surface-600'} bg-surface-800 py-3 pl-10 pr-4 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="Your display name"
						/>
					</div>
					{#if errors.displayName}
						<p class="mt-1 text-sm text-red-400">{errors.displayName}</p>
					{/if}
				</div>

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
							class="w-full rounded-lg border {errors.email ? 'border-red-500' : 'border-surface-600'} bg-surface-800 py-3 pl-10 pr-4 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="you@example.com"
						/>
					</div>
					{#if errors.email}
						<p class="mt-1 text-sm text-red-400">{errors.email}</p>
					{/if}
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
							class="w-full rounded-lg border {errors.password ? 'border-red-500' : 'border-surface-600'} bg-surface-800 py-3 pl-10 pr-12 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="At least 8 characters"
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
					{#if errors.password}
						<p class="mt-1 text-sm text-red-400">{errors.password}</p>
					{/if}
				</div>

				<div>
					<label for="passwordConfirm" class="block text-sm font-medium text-surface-300">
						Confirm password
					</label>
					<div class="relative mt-2">
						<Lock class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
						<input
							id="passwordConfirm"
							type={showPassword ? 'text' : 'password'}
							bind:value={passwordConfirm}
							required
							class="w-full rounded-lg border {errors.passwordConfirm ? 'border-red-500' : 'border-surface-600'} bg-surface-800 py-3 pl-10 pr-4 text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							placeholder="Confirm your password"
						/>
					</div>
					{#if errors.passwordConfirm}
						<p class="mt-1 text-sm text-red-400">{errors.passwordConfirm}</p>
					{/if}
				</div>

				<div class="flex items-start gap-2">
					<input
						type="checkbox"
						id="terms"
						required
						class="mt-1 h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
					/>
					<label for="terms" class="text-sm text-surface-400">
						I agree to the <a href="/terms" class="text-primary-400 hover:underline">Terms of Service</a>
						and <a href="/privacy" class="text-primary-400 hover:underline">Privacy Policy</a>
					</label>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full rounded-lg bg-primary-500 py-3 font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? 'Creating account...' : 'Create account'}
				</button>
			</form>

			<p class="mt-8 text-center text-surface-400">
				Already have an account?
				<a href="/auth/login" class="text-primary-400 hover:text-primary-300 font-medium">
					Sign in
				</a>
			</p>
		</div>
	</div>
</div>
