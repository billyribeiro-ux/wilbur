#!/usr/bin/env node
/**
 * Ensures the React app (repo `src/`, `tests/`, `scripts/`) never imports the SvelteKit app (`svelte-app/`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  const skip = new Set(['node_modules', 'dist', 'build', '.svelte-kit']);
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, acc);
    else if (/\.(ts|tsx|mts|cts|js|mjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const fromSvelteApp = /from\s+['"]([^'"]*svelte-app[^'"]*)['"]/;
const bad = [];

for (const base of ['src', 'tests', 'scripts']) {
  for (const file of walkFiles(join(root, base))) {
    const text = readFileSync(file, 'utf8');
    const m = text.match(fromSvelteApp);
    if (m) bad.push(`${relative(root, file)}: ${m[1]}`);
  }
}

if (bad.length) {
  console.error('Isolation check failed — React tree must not import svelte-app/:\n');
  for (const line of bad) console.error(`  ${line}`);
  process.exit(1);
}

console.log('App isolation OK (React tree does not import svelte-app).');
