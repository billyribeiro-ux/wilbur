<script lang="ts">
	import { themeStore } from '$lib/stores';

	let logoUrl = $state('');
	let tenantName = $state('');
	let accentColor = $state(themeStore.primaryColor ?? '#3b82f6');
	let secondaryColor = $state('#22c55e');

	function handleSave() {
		themeStore.setPrimaryColor(accentColor);
		// TODO: persist branding via API
		console.log('Branding saved:', { tenantName, logoUrl, accentColor, secondaryColor });
	}
</script>

<div class="branding-settings">
	<h3>🏢 Branding Settings</h3>
	<p class="subtitle">Customize the look and feel for your organization</p>

	<section>
		<label>
			<span>Organization Name</span>
			<input type="text" bind:value={tenantName} placeholder="Acme Trading Co" />
		</label>
		<label>
			<span>Logo URL</span>
			<input type="url" bind:value={logoUrl} placeholder="https://example.com/logo.png" />
		</label>
		{#if logoUrl}
			<div class="logo-preview"><img src={logoUrl} alt="Logo Preview" /></div>
		{/if}
	</section>

	<section>
		<h4>Colors</h4>
		<div class="color-row">
			<label>
				<span>Primary Accent</span>
				<input type="color" bind:value={accentColor} />
			</label>
			<label>
				<span>Secondary</span>
				<input type="color" bind:value={secondaryColor} />
			</label>
		</div>
	</section>

	<button class="save-btn" onclick={handleSave}>Save Branding</button>
</div>

<style>
	.branding-settings { padding: 1rem; }
	h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
	h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-secondary, #aaa); }
	.subtitle { margin: 0 0 1rem; font-size: 0.8rem; color: var(--text-secondary, #888); }
	section { margin-bottom: 1.25rem; }
	label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; margin-bottom: 0.65rem; }
	input[type="text"], input[type="url"] { padding: 0.5rem; border: 1px solid var(--border, #444); border-radius: 6px; background: var(--surface-3, #2a2a3e); color: inherit; font-size: 0.85rem; }
	input[type="color"] { width: 40px; height: 32px; border: none; border-radius: 6px; cursor: pointer; background: none; }
	.logo-preview { padding: 0.5rem; background: var(--surface-2, #1e1e2e); border-radius: 8px; text-align: center; }
	.logo-preview img { max-height: 64px; max-width: 200px; }
	.color-row { display: flex; gap: 1rem; }
	.save-btn { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 8px; padding: 0.5rem 1.25rem; cursor: pointer; font-size: 0.85rem; }
</style>
