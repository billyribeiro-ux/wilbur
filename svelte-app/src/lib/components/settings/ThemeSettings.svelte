<script lang="ts">
	import { themeStore } from '$lib/stores';

	const presets = [
		{ name: 'Dark Blue', bg: '#16161e', primary: '#3b82f6', surface: '#1e1e2e' },
		{ name: 'Midnight', bg: '#0f0f14', primary: '#8b5cf6', surface: '#1a1a24' },
		{ name: 'Forest', bg: '#0f1a14', primary: '#22c55e', surface: '#162418' },
		{ name: 'Sunset', bg: '#1a1010', primary: '#f97316', surface: '#241a16' },
		{ name: 'Ocean', bg: '#0f1620', primary: '#06b6d4', surface: '#162030' },
		{ name: 'Rose', bg: '#1a1016', primary: '#ec4899', surface: '#241622' },
	];

	let customPrimary = $state(themeStore.primaryColor ?? '#3b82f6');
	let customFont = $state(themeStore.fontFamily ?? 'Inter');

	const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Code Pro', 'Poppins', 'Nunito'];

	function applyPreset(preset: typeof presets[0]) {
		themeStore.setPrimaryColor(preset.primary);
		customPrimary = preset.primary;
	}

	function applyCustom() {
		themeStore.setPrimaryColor(customPrimary);
		themeStore.setFontFamily(customFont);
	}
</script>

<div class="theme-settings">
	<h3>🎨 Theme Settings</h3>

	<section>
		<h4>Presets</h4>
		<div class="presets-grid">
			{#each presets as preset (preset.name)}
				<button class="preset-card" style:background={preset.bg} onclick={() => applyPreset(preset)}>
					<div class="preset-accent" style:background={preset.primary}></div>
					<span class="preset-name">{preset.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<h4>Custom</h4>
		<div class="custom-row">
			<label>
				<span>Accent Color</span>
				<input type="color" bind:value={customPrimary} />
			</label>
			<label>
				<span>Font</span>
				<select bind:value={customFont}>
					{#each fonts as f (f)}<option value={f}>{f}</option>{/each}
				</select>
			</label>
			<button class="apply-btn" onclick={applyCustom}>Apply</button>
		</div>
	</section>
</div>

<style>
	.theme-settings { padding: 1rem; }
	h3 { margin: 0 0 1rem; font-size: 1.1rem; }
	h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-secondary, #aaa); }
	section { margin-bottom: 1.25rem; }
	.presets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
	.preset-card { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border, #333); border-radius: 8px; cursor: pointer; color: white; font-size: 0.75rem; transition: transform 0.15s; }
	.preset-card:hover { transform: scale(1.05); }
	.preset-accent { width: 100%; height: 4px; border-radius: 2px; }
	.preset-name { opacity: 0.8; }
	.custom-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
	.custom-row label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; }
	.custom-row input[type="color"] { width: 40px; height: 32px; border: none; border-radius: 6px; cursor: pointer; background: none; }
	.custom-row select { padding: 0.35rem; border: 1px solid var(--border, #444); border-radius: 6px; background: var(--surface-3, #2a2a3e); color: inherit; font-size: 0.8rem; }
	.apply-btn { background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 6px; padding: 0.4rem 0.85rem; cursor: pointer; font-size: 0.8rem; }
</style>
