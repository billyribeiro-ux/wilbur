<script lang="ts">
	import { spotifyStore } from '$lib/stores';

	interface Integration {
		id: string; name: string; icon: string; description: string;
		connected: boolean; action: () => void;
	}

	const integrations = $derived<Integration[]>([
		{
			id: 'spotify', name: 'Spotify', icon: '🎵',
			description: 'Stream music and share what you\'re listening to',
			connected: spotifyStore.isConnected,
			action: () => {
				if (spotifyStore.isConnected) spotifyStore.disconnect();
				else connectSpotify();
			}
		},
		{
			id: 'linkedin', name: 'LinkedIn', icon: '💼',
			description: 'Connect your professional profile',
			connected: false,
			action: () => { /* TODO: OAuth flow */ alert('LinkedIn integration coming soon'); }
		},
		{
			id: 'x', name: 'X (Twitter)', icon: '🐦',
			description: 'Share alerts and updates to X',
			connected: false,
			action: () => { /* TODO: OAuth flow */ alert('X integration coming soon'); }
		}
	]);

	function connectSpotify() {
		// In production, this would redirect to Spotify OAuth
		window.location.href = '/api/spotify/auth';
	}
</script>

<div class="integrations-panel">
	<h3>🔌 Integrations</h3>
	<p class="subtitle">Connect third-party services to enhance your trading room</p>

	<div class="integrations-list">
		{#each integrations as integ (integ.id)}
			<div class="integration-card" class:connected={integ.connected}>
				<span class="integ-icon">{integ.icon}</span>
				<div class="integ-info">
					<span class="integ-name">{integ.name}</span>
					<span class="integ-desc">{integ.description}</span>
				</div>
				<button
					class="integ-btn"
					class:connected={integ.connected}
					onclick={integ.action}
				>
					{integ.connected ? 'Disconnect' : 'Connect'}
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.integrations-panel { padding: 1rem; }
	h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
	.subtitle { margin: 0 0 1rem; font-size: 0.8rem; color: var(--text-secondary, #888); }
	.integrations-list { display: flex; flex-direction: column; gap: 0.65rem; }
	.integration-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem; background: var(--surface-2, #1e1e2e); border-radius: 10px; border: 1px solid var(--border, #333); }
	.integration-card.connected { border-color: var(--color-primary, #3b82f6); }
	.integ-icon { font-size: 1.5rem; flex-shrink: 0; }
	.integ-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
	.integ-name { font-weight: 600; font-size: 0.9rem; }
	.integ-desc { font-size: 0.75rem; color: var(--text-secondary, #aaa); }
	.integ-btn { padding: 0.4rem 0.85rem; border-radius: 6px; border: 1px solid var(--border, #444); background: transparent; color: inherit; cursor: pointer; font-size: 0.8rem; flex-shrink: 0; }
	.integ-btn.connected { background: #ef4444; color: white; border: none; }
	.integ-btn:not(.connected) { background: var(--color-primary, #3b82f6); color: white; border: none; }
</style>
