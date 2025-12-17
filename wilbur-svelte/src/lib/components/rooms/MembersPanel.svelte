<script lang="ts">
	import { roomStore, authStore, toastStore } from '$lib/stores';
	import { Users, Crown, Shield, User, DotsThree, Prohibit, ChatCircle, UserMinus } from 'phosphor-svelte';

	let showActionsFor = $state<string | null>(null);

	function getRoleIcon(role: string) {
		switch (role) {
			case 'admin':
				return { icon: Crown, class: 'text-yellow-400' };
			case 'host':
				return { icon: Crown, class: 'text-purple-400' };
			case 'moderator':
				return { icon: Shield, class: 'text-blue-400' };
			default:
				return { icon: User, class: 'text-surface-400' };
		}
	}

	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-yellow-500/20 text-yellow-400';
			case 'host':
				return 'bg-purple-500/20 text-purple-400';
			case 'moderator':
				return 'bg-blue-500/20 text-blue-400';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	function canModerate(): boolean {
		const role = authStore.user?.role;
		return role === 'admin' || role === 'host' || role === 'moderator';
	}

	function isCurrentUser(userId: string): boolean {
		return userId === authStore.user?.id;
	}

	async function handleKickUser(userId: string, displayName: string) {
		// TODO: Implement kick functionality
		toastStore.warning(`Kick ${displayName} - Feature coming soon`);
		showActionsFor = null;
	}

	async function handleBanUser(userId: string, displayName: string) {
		// TODO: Implement ban functionality
		toastStore.warning(`Ban ${displayName} - Feature coming soon`);
		showActionsFor = null;
	}

	async function handleDirectMessage(userId: string) {
		// TODO: Implement DM functionality
		toastStore.info('Direct messaging coming soon');
		showActionsFor = null;
	}

	// Sort members by role importance
	const sortedMembers = $derived(
		[...roomStore.members].sort((a, b) => {
			const roleOrder = { admin: 0, host: 1, moderator: 2, member: 3 };
			const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
			const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
			return roleA - roleB;
		})
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-surface-700 px-4 py-3">
		<div class="flex items-center gap-2">
			<Users class="h-5 w-5 text-primary-400" />
			<h2 class="font-semibold">Members</h2>
			<span class="rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
				{roomStore.members.length}
			</span>
		</div>
	</div>

	<!-- Members List -->
	<div class="flex-1 overflow-y-auto p-4 space-y-2">
		{#if sortedMembers.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="rounded-full bg-surface-800 p-4">
					<Users class="h-8 w-8 text-surface-500" />
				</div>
				<h3 class="mt-4 font-medium">No members yet</h3>
				<p class="mt-1 text-sm text-surface-400">Members will appear here</p>
			</div>
		{:else}
			<!-- Group by role -->
			{@const admins = sortedMembers.filter(m => m.role === 'admin' || m.role === 'host')}
			{@const moderators = sortedMembers.filter(m => m.role === 'moderator')}
			{@const members = sortedMembers.filter(m => m.role === 'member')}

			{#if admins.length > 0}
				<div class="mb-4">
					<h3 class="text-xs font-semibold uppercase text-surface-500 mb-2">
						Admins & Hosts - {admins.length}
					</h3>
					{#each admins as member}
						<MemberItem {member} bind:showActionsFor {canModerate} {isCurrentUser} {getRoleIcon} {getRoleBadgeClass} {handleKickUser} {handleBanUser} {handleDirectMessage} />
					{/each}
				</div>
			{/if}

			{#if moderators.length > 0}
				<div class="mb-4">
					<h3 class="text-xs font-semibold uppercase text-surface-500 mb-2">
						Moderators - {moderators.length}
					</h3>
					{#each moderators as member}
						<MemberItem {member} bind:showActionsFor {canModerate} {isCurrentUser} {getRoleIcon} {getRoleBadgeClass} {handleKickUser} {handleBanUser} {handleDirectMessage} />
					{/each}
				</div>
			{/if}

			{#if members.length > 0}
				<div>
					<h3 class="text-xs font-semibold uppercase text-surface-500 mb-2">
						Members - {members.length}
					</h3>
					{#each members as member}
						<MemberItem {member} bind:showActionsFor {canModerate} {isCurrentUser} {getRoleIcon} {getRoleBadgeClass} {handleKickUser} {handleBanUser} {handleDirectMessage} />
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

{#snippet MemberItem(props: { member: typeof sortedMembers[0], showActionsFor: string | null, canModerate: () => boolean, isCurrentUser: (id: string) => boolean, getRoleIcon: (role: string) => { icon: any, class: string }, getRoleBadgeClass: (role: string) => string, handleKickUser: (id: string, name: string) => void, handleBanUser: (id: string, name: string) => void, handleDirectMessage: (id: string) => void })}
	{@const member = props.member}
	{@const roleStyle = props.getRoleIcon(member.role)}
	<div class="group relative flex items-center gap-3 rounded-lg p-2 hover:bg-surface-800 transition">
		<!-- Avatar -->
		<div class="relative">
			{#if member.user?.avatarUrl}
				<img
					src={member.user.avatarUrl}
					alt={member.user.displayName}
					class="h-10 w-10 rounded-full object-cover"
				/>
			{:else}
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 font-medium">
					{member.user?.displayName?.[0]?.toUpperCase() || '?'}
				</div>
			{/if}
			<!-- Online indicator -->
			<div class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-900 bg-green-500"></div>
		</div>

		<!-- Info -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<span class="font-medium truncate">
					{member.user?.displayName || 'Unknown'}
				</span>
				{#if props.isCurrentUser(member.userId)}
					<span class="text-xs text-surface-500">(you)</span>
				{/if}
			</div>
			<div class="flex items-center gap-1.5">
				<span class="rounded px-1.5 py-0.5 text-xs capitalize {props.getRoleBadgeClass(member.role)}">
					{member.role}
				</span>
				{#if member.location?.country}
					<span class="text-xs text-surface-500">{member.location.country}</span>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		{#if !props.isCurrentUser(member.userId)}
			<div class="relative">
				<button
					onclick={() => (showActionsFor = showActionsFor === member.id ? null : member.id)}
					class="rounded-lg p-1.5 text-surface-500 opacity-0 group-hover:opacity-100 hover:bg-surface-700 hover:text-white transition"
				>
					<DotsThree class="h-4 w-4" />
				</button>

				{#if showActionsFor === member.id}
					<div class="absolute right-0 top-full mt-1 w-40 rounded-lg border border-surface-600 bg-surface-800 py-1 shadow-xl z-10">
						<button
							onclick={() => props.handleDirectMessage(member.userId)}
							class="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700"
						>
							<ChatCircle class="h-4 w-4" />
							Message
						</button>
						{#if props.canModerate() && member.role === 'member'}
							<button
								onclick={() => props.handleKickUser(member.userId, member.user?.displayName || 'User')}
								class="flex w-full items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-surface-700"
							>
								<UserMinus class="h-4 w-4" />
								Kick
							</button>
							<button
								onclick={() => props.handleBanUser(member.userId, member.user?.displayName || 'User')}
								class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-700"
							>
								<Prohibit class="h-4 w-4" />
								Ban
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}
