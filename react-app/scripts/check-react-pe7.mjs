#!/usr/bin/env node
/**
 * PE7-style gates for the React app (`src/`): architecture boundaries and banned deps.
 * Run: pnpm run check:pe7
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(root, 'src');

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  const skip = new Set(['node_modules', 'dist', 'build']);
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, acc);
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const checks = [
  {
    id: 'svelte-isolation',
    pattern: /from\s+['"][^'"]*svelte-app[^'"]*['"]/,
    message: 'React src must not import svelte-app/ (use check:isolation for full tree).',
  },
  {
    id: 'no-supabase-client',
    pattern: /from\s+['"]@supabase\/supabase-js['"]/,
    message: 'Use wilbur-api auth/API — no Supabase client in React.',
  },
  {
    id: 'no-livekit-sdk',
    pattern: /from\s+['"]livekit-client['"]/,
    message: 'LiveKit client removed; use roomTransport / future SFU integration.',
  },
];

const files = walkFiles(srcRoot);
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
  console.error('check-react-pe7 failed:\n');
  for (const f of failures) {
    console.error(`  [${f.id}] ${f.file}: ${f.message}`);
  }
  process.exit(1);
}

console.log(`PE7 React checks OK (${files.length} files under src/).`);
