# Wilbur — Trading Room Platform

This repository hosts **three independent projects** that share no source code,
no dependencies, and no lockfile. Each lives in its own self-contained folder and
can be built, linted, tested, and deployed on its own — and could be split into a
separate repository with no cross-coupling.

| Project | Folder | Stack | Dev port |
|---------|--------|-------|----------|
| React app | [`react-app/`](./react-app) | React 19 + TypeScript + Vite, Zustand, Tailwind | **5174** |
| Svelte app | [`svelte-app/`](./svelte-app) | SvelteKit 2 + Svelte 5, Skeleton UI, PocketBase | **5173** |
| Backend API | [`wilbur-api/`](./wilbur-api) | Rust (Axum), SQLx, PostgreSQL | 3000 |

> The React and Svelte apps are two parallel implementations of the same product.
> They are deliberately kept separate — see **Independence boundaries** below.

## Getting started

Each project is independent. Pick a folder and follow its own README; there is **no
root install** and **no root `package.json`**.

```bash
# React app
cd react-app && pnpm install && pnpm run dev      # http://localhost:5174

# Svelte app
cd svelte-app && pnpm install && pnpm run dev      # http://localhost:5173

# Backend API (Rust)
cd wilbur-api && cargo run                          # http://localhost:3000
```

The two front-end dev servers use fixed, distinct ports (5174 and 5173) so they can
run at the same time against the same backend.

Use **Node.js 24.14.1** for the front-end apps (each folder has its own `.nvmrc`).

## Independence boundaries

The apps are isolated structurally (separate folders, separate installs, separate
lockfiles) and by automated gates:

- **React** must not import `svelte-app/`. Enforced by ESLint `no-restricted-imports`
  plus `pnpm run check:isolation` and `pnpm run check:pe7` (run from `react-app/`).
- **Svelte** must not import React, Zustand, the Supabase client, or the React
  `src/` tree. Enforced by `pnpm run check:pe7` (run from `svelte-app/`) plus its
  own ESLint config and `svelte-check`.
- Neither app reaches into the other's folder for scripts or config — each ships its
  own copy.

## CI

GitHub Actions runs one **path-filtered** workflow per project, so a change to one
project never triggers another's pipeline:

- [`.github/workflows/react.yml`](./.github/workflows/react.yml) — `react-app/**`
- [`.github/workflows/svelte.yml`](./.github/workflows/svelte.yml) — `svelte-app/**`
- [`.github/workflows/api.yml`](./.github/workflows/api.yml) — `wilbur-api/**`
- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) — deploys the API

Each front-end app also carries its own self-contained workflow under
`<app>/.github/` so it stays buildable if extracted into a standalone repository.

## Backend database

```bash
cd wilbur-api
docker compose -f ../docker-compose.yml up -d   # local PostgreSQL
sqlx migrate run                                 # run migrations
```

## License

MIT
