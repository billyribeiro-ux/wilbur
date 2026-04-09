#!/usr/bin/env node
/**
 * PE7-style gates for the SvelteKit app (`svelte-app/`): architecture boundaries and banned deps.
 * Run: pnpm run check:pe7:svelte
 *
 * Pairs with: `pnpm --dir svelte-app run lint`, `pnpm --dir svelte-app run check`, and Cursor rule `.cursor/rules/wilbur-svelte-pe7.mdc`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = join(root, 'svelte-app');
const srcRoots = [
	join(appRoot, 'src'),
	join(appRoot, 'e2e'),
	join(appRoot, 'scripts')
].filter((p) => existsSync(p));

function walkFiles(dir, acc = []) {
	if (!existsSync(dir)) return acc;
	const skip = new Set(['node_modules', 'dist', 'build', '.svelte-kit']);
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		if (skip.has(ent.name)) continue;
		const p = join(dir, ent.name);
		if (ent.isDirectory()) walkFiles(p, acc);
		else if (/\.(ts|svelte|mts|cts|js|mjs)$/.test(ent.name)) acc.push(p);
	}
	return acc;
}

const checks = [
	{
		id: 'no-react',
		pattern: /from\s+['"]react['"]/,
		message: 'SvelteKit app must not import react — use Svelte 5 runes/components only.'
	},
	{
		id: 'no-react-dom',
		pattern: /from\s+['"]react-dom(?:\/client)?['"]/,
		message: 'SvelteKit app must not import react-dom.'
	},
	{
		id: 'no-zustand',
		pattern: /from\s+['"]zustand['"]/,
		message: 'Use Svelte 5 runes / $lib/stores — no Zustand in the Svelte app.'
	},
	{
		id: 'no-supabase-js',
		pattern: /from\s+['"]@supabase\/supabase-js['"]/,
		message: 'Use PocketBase ($lib/services/pocketbase) or wilbur-api — no Supabase client in svelte-app.'
	},
	{
		id: 'no-react-src-escape',
		// Importing the Vite/React tree by name (repo root `src/`) — apps are isolated.
		pattern: /from\s+['"][^'"]*\/src\/(?:api|store|components)\//,
		message: 'Do not import the React app modules (src/api, src/store, src/components) into svelte-app.'
	}
];

const files = [];
for (const base of srcRoots) {
	walkFiles(base, files);
}

const failures = [];

for (const file of files) {
	const text = readFileSync(file, 'utf8');
	const rel = relative(root, file);
	for (const { id, pattern, message } of checks) {
		if (pattern.test(text)) {
			failures.push({ file: rel, id, message });
		}
	}
}

if (failures.length) {
	console.error('check-svelte-pe7 failed:\n');
	for (const f of failures) {
		console.error(`  [${f.id}] ${f.file}: ${f.message}`);
	}
	process.exit(1);
}

console.log(`PE7 SvelteKit checks OK (${files.length} files under svelte-app).`);
