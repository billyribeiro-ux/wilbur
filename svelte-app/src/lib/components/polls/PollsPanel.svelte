<script lang="ts">
	import { roomStore } from '$lib/stores';
	import CreatePollModal from './CreatePollModal.svelte';
	import type { PollWithVotes } from '$lib/types';

	let { isAdmin = false }: { isAdmin?: boolean } = $props();
	let showCreate = $state(false);

	function getPercentage(count: number, total: number): number {
		return total === 0 ? 0 : Math.round((count / total) * 100);
	}

	async function handleVote(poll: PollWithVotes, optionIndex: number) {
		if (poll.userVote !== undefined) return;
		await roomStore.votePoll(poll.id, optionIndex);
	}

	async function handleClose(pollId: string) {
		await roomStore.closePoll(pollId);
	}
</script>

<div class="polls-panel">
	<div class="polls-header">
		<h3>📊 Polls</h3>
		{#if isAdmin}
			<button class="btn-create" onclick={() => showCreate = true}>+ New Poll</button>
		{/if}
	</div>

	{#if roomStore.polls.length === 0}
		<div class="empty">No polls yet</div>
	{:else}
		<div class="polls-list">
			{#each roomStore.polls as poll (poll.id)}
				<div class="poll-card" class:closed={!poll.isActive}>
					<div class="poll-title">{poll.title}</div>
					{#if poll.description}
						<div class="poll-desc">{poll.description}</div>
					{/if}
					<div class="poll-options">
						{#each poll.options as option, i (`${poll.id}-${i}`)}
							{@const pct = getPercentage(poll.voteCounts[i] ?? 0, poll.totalVotes)}
							<button
								class="poll-option"
								class:voted={poll.userVote === i}
								class:disabled={!poll.isActive || poll.userVote !== undefined}
								disabled={!poll.isActive || poll.userVote !== undefined}
								onclick={() => handleVote(poll, i)}
							>
								<span class="option-text">{option}</span>
								<span class="option-pct">{pct}%</span>
								<div class="option-bar" style:width="{pct}%"></div>
							</button>
						{/each}
					</div>
					<div class="poll-meta">
						<span>{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
						{#if !poll.isActive}<span class="closed-badge">Closed</span>{/if}
						{#if isAdmin && poll.isActive}
							<button class="btn-close" onclick={() => handleClose(poll.id)}>Close</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showCreate}
	<CreatePollModal onclose={() => showCreate = false} />
{/if}

<style>
	.polls-panel { display: flex; flex-direction: column; gap: 0.5rem; height: 100%; padding: 0.75rem; overflow-y: auto; }
	.polls-header { display: flex; justify-content: space-between; align-items: center; }
	.polls-header h3 { margin: 0; font-size: 0.95rem; }
	.btn-create { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 6px; padding: 0.35rem 0.75rem; cursor: pointer; font-size: 0.8rem; }
	.empty { color: var(--text-secondary, #888); text-align: center; padding: 2rem 0; font-size: 0.85rem; }
	.polls-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.poll-card { background: var(--surface-2, #1e1e2e); border-radius: 8px; padding: 0.75rem; }
	.poll-card.closed { opacity: 0.65; }
	.poll-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.25rem; }
	.poll-desc { font-size: 0.8rem; color: var(--text-secondary, #aaa); margin-bottom: 0.5rem; }
	.poll-options { display: flex; flex-direction: column; gap: 0.35rem; }
	.poll-option { position: relative; display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.65rem; border: 1px solid var(--border, #333); border-radius: 6px; background: transparent; color: inherit; cursor: pointer; overflow: hidden; text-align: left; font-size: 0.85rem; }
	.poll-option.disabled { cursor: default; }
	.poll-option.voted { border-color: var(--color-primary, #3b82f6); }
	.option-text, .option-pct { position: relative; z-index: 1; }
	.option-pct { font-size: 0.75rem; color: var(--text-secondary, #aaa); }
	.option-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--color-primary, #3b82f6); opacity: 0.15; transition: width 0.3s ease; }
	.poll-meta { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary, #888); }
	.closed-badge { background: #ef4444; color: white; border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.65rem; }
	.btn-close { margin-left: auto; background: none; border: 1px solid #ef4444; color: #ef4444; border-radius: 4px; padding: 0.15rem 0.5rem; cursor: pointer; font-size: 0.7rem; }
</style>
