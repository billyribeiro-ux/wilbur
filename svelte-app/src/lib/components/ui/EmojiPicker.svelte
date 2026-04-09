<script lang="ts">
	let { onselect, onclose }: { onselect: (emoji: string) => void; onclose: () => void } = $props();

	const categories: { name: string; emojis: string[] }[] = [
		{ name: '😀 Smileys', emojis: ['😀','😂','🤣','😊','😍','🤩','😎','🤔','😤','🔥','💯','👍','👎','👏','🙌','💪','🚀','📈','📉','💰','💵','💎','🏆','⚡','❤️','💔','🎯','🔔','⭐','✅','❌','⚠️'] },
		{ name: '📊 Trading', emojis: ['📊','📈','📉','💹','💰','💵','💴','💶','💷','🏦','💳','🪙','📱','💻','🖥️','⏰','🔒','🔓','📌','📋','📝','🗂️','📂','🔍','🔎','💡','⚙️','🛠️','📡','🌐'] }
	];

	let activeCategory = $state(0);
</script>

<div class="emoji-backdrop" role="presentation" onclick={onclose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="emoji-picker" role="dialog" aria-label="Emoji picker" tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<div class="categories">
			{#each categories as cat, i}
				<button
					class:active={activeCategory === i}
					onclick={() => activeCategory = i}
				>{cat.name.split(' ')[0]}</button>
			{/each}
		</div>
		<div class="emoji-grid">
			{#each categories[activeCategory].emojis as emoji}
				<button class="emoji-btn" onclick={() => onselect(emoji)}>{emoji}</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.emoji-backdrop { position: fixed; inset: 0; z-index: 80; }
	.emoji-picker { position: absolute; bottom: 60px; right: 10px; width: 300px; background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #333); border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 81; }
	.categories { display: flex; border-bottom: 1px solid var(--border, #333); }
	.categories button { flex: 1; background: none; border: none; padding: 0.5rem; cursor: pointer; font-size: 1rem; opacity: 0.6; }
	.categories button.active { opacity: 1; border-bottom: 2px solid var(--color-primary, #3b82f6); }
	.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; padding: 0.5rem; max-height: 200px; overflow-y: auto; }
	.emoji-btn { background: none; border: none; font-size: 1.25rem; padding: 0.3rem; cursor: pointer; border-radius: 4px; }
	.emoji-btn:hover { background: var(--surface-3, #2a2a3e); }
</style>
