import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components',
			$stores: './src/lib/stores',
			$services: './src/lib/services',
			$types: './src/lib/types'
		}
	}
	// Note: Not setting runes: true globally to allow legacy libraries (lucide-svelte, svelte-sonner)
	// Our components use runes syntax which works in default mode
};

export default config;
