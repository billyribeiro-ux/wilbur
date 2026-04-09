<script lang="ts">
	import { notificationStore } from '$lib/stores';

	const typeIcons: Record<string, string> = {
		mention: '💬', reply: '↩️', broadcast_alert: '📢', room_invite: '🚪', system: '⚙️'
	};

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		if (diffMs < 60_000) return 'just now';
		if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
		if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
		return d.toLocaleDateString();
	}
</script>

{#if notificationStore.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => notificationStore.close()}>
		<div class="panel" onclick={(e) => e.stopPropagation()}>
			<div class="panel-header">
				<h3>🔔 Notifications</h3>
				<div class="header-actions">
					<button class="sound-btn" onclick={() => notificationStore.toggleSound()} title={notificationStore.soundEnabled ? 'Mute' : 'Unmute'}>
						{notificationStore.soundEnabled ? '🔔' : '🔕'}
					</button>
					<button class="close-btn" onclick={() => notificationStore.close()}>✕</button>
				</div>
			</div>
			{#if notificationStore.notifications.length === 0}
				<div class="empty">No notifications yet</div>
			{:else}
				<div class="notif-list">
					{#each notificationStore.notifications as notif (notif.id)}
						<div class="notif-item">
							<span class="notif-icon">{typeIcons[notif.type] ?? '📌'}</span>
							<div class="notif-content">
								<span class="notif-title">{notif.title}</span>
								<span class="notif-msg">{notif.message}</span>
								<span class="notif-time">{formatTime(notif.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay { position: fixed; inset: 0; z-index: 90; }
	.panel { position: fixed; top: 0; right: 0; width: 360px; max-width: 100vw; height: 100vh; background: var(--surface-1, #16161e); border-left: 1px solid var(--border, #333); display: flex; flex-direction: column; z-index: 91; }
	.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #333); }
	.panel-header h3 { margin: 0; font-size: 1rem; }
	.header-actions { display: flex; gap: 0.35rem; }
	.sound-btn, .close-btn { background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem; padding: 0.2rem; }
	.empty { padding: 3rem 1rem; text-align: center; color: var(--text-secondary, #888); font-size: 0.85rem; }
	.notif-list { flex: 1; overflow-y: auto; }
	.notif-item { display: flex; gap: 0.65rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #222); }
	.notif-icon { font-size: 1.2rem; flex-shrink: 0; }
	.notif-content { display: flex; flex-direction: column; min-width: 0; }
	.notif-title { font-weight: 600; font-size: 0.85rem; }
	.notif-msg { font-size: 0.8rem; color: var(--text-secondary, #aaa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.notif-time { font-size: 0.7rem; color: var(--text-secondary, #666); margin-top: 0.15rem; }
</style>
