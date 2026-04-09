import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
		strictPort: true,
		host: true
	},
	preview: {
		port: 4173
	},
	optimizeDeps: {
		exclude: ['pocketbase']
	},
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		exclude: ['node_modules', 'e2e', '**/.svelte-kit/**'],
		passWithNoTests: true,
		environment: 'node'
	}
});
