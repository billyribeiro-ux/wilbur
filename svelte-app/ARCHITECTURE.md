# Architecture — Wilbur SvelteKit app

A guide for any engineer maintaining this app. It documents how the pieces fit, the
conventions to follow, and where to look for common tasks. Pair it with
[`SETUP_GUIDE.md`](./SETUP_GUIDE.md) (how to run it) and [`CLAUDE.md`](./CLAUDE.md)
(Svelte MCP usage).

## Stack

- **SvelteKit 2 + Svelte 5 (runes)** — UI and routing.
- **PocketBase** — auth, data, and realtime (the primary backend).
- **Turso / libSQL** — edge SQL (see `$lib/services/turso`).
- **LiveKit** — screen-share / media transport (server token at
  `routes/api/livekit/token`, client at `$lib/services/livekit.svelte.ts`).
- **Valibot** — input validation (`$lib/validation/schemas.ts`).
- **Tailwind v4 + Skeleton theme** — styling.
- **Vitest** — unit tests; **Playwright** — E2E.

## Directory layout

```
src/
  app.css, app.html, app.d.ts        # global styles, shell, App.Locals types
  hooks.server.ts                    # per-request PocketBase + auth from cookie
  lib/
    components/<feature>/*.svelte     # UI, grouped by feature (chat, whiteboard, …)
    services/                         # external-system clients
      pocketbase.ts                   #   PB singleton + auth/realtime helpers + Collections
      turso.ts, livekit.svelte.ts
      mappers.ts                      #   PB record → app-type mappers (mapUser)
    stores/*.svelte.ts                # Svelte 5 runes stores (the app's state)
    types/index.ts                    # domain types
    utils/format.ts                   # presentation helpers (relative time, …)
    validation/schemas.ts             # Valibot schemas + validateWithSchema()
  routes/                            # pages + /api endpoints
scripts/                             # setup-pocketbase / seed-pocketbase / pe7 gate
e2e/                                 # Playwright specs
```

## State management — runes stores (the core convention)

State lives in **class-based runes stores** exported as singletons from
`$lib/stores/*.svelte.ts` (re-exported via `$lib/stores/index.ts`). Conventions:

- Reactive fields use `$state`; computed values use **getters** (reactive because
  they read `$state`) — see `authStore.isAdmin` / `canModerate`.
- Reactive **maps/sets** use `SvelteMap`/`SvelteSet` from `svelte/reactivity` — do
  **not** use the `this.map = new Map(this.map)` reassignment hack (see
  `presence.svelte.ts`, `whiteboard.svelte.ts`).
- Single source of truth: role rules live only on `authStore`; PocketBase user-record
  mapping lives only in `mappers.ts#mapUser`. Don't reintroduce copies.
- Async actions set `this.error` and return a boolean/result; components surface it.

## Data flow

1. **Auth**: `authStore` wraps `pb.authStore`. `hooks.server.ts` hydrates
   `locals.user` from the `pb_auth` cookie on each SSR request.
2. **Reads**: stores fetch via `pb.collection(...).getList/getOne` and map records
   to domain types (`mappers.ts`, plus each store's private `mapToX`).
3. **Realtime**: stores subscribe via `subscribeToCollection` (`room.svelte.ts`,
   `privateChat.svelte.ts`); create/update/delete events patch the `$state` arrays.
4. **Writes**: stores `create/update` records; the realtime echo updates the list.
   Chat additionally shows an **optimistic** pending message until the echo arrives.

`Collections` (string names) and the realtime/file/auth helpers are all in
`services/pocketbase.ts` — the only module that imports the `pocketbase` SDK
directly besides the stores.

## Validation

All user input is validated with **Valibot** before hitting a store:

```ts
const result = validateWithSchema(someSchema, { ...fields });
if (!result.success) { errors = result.errors; return; }   // errors: { field: message }
await store.doThing(result.data);
```

Schemas + the helper are in `validation/schemas.ts`. Forms render
`errors.<field>` inline. Used by: login, register, CreateRoomModal, CreatePollModal,
AlertsPanel, ChatPanel. Add new forms the same way.

## Notable patterns

- **Whiteboard** (`components/whiteboard/`): the canvas renders **on demand** via a
  single `$effect` that reads the reactive store state it draws (viewport, shapes,
  selection, in-progress stroke, laser) — no perpetual `requestAnimationFrame`. A
  `ResizeObserver` (Svelte attachment) re-fits/redraws on element resize. All shape
  logic (hit-test, move, add text/emoji, bounds) is pure and unit-tested in
  `whiteboard.svelte.ts` / `whiteboard.test.ts`.
- **Chat** (`components/chat/`): `ChatMessage.svelte` renders one message;
  `ChatPanel.svelte` owns the list/input/optimistic state. Message bodies render as
  **plain text** (Svelte auto-escapes) — no `{@html}` anywhere (the
  `svelte/no-at-html-tags` lint rule is `error`).
- **Screen share**: `livekit.svelte.ts` connects via the token endpoint and renders
  remote tracks; falls back to a local preview when LiveKit env isn't configured.

## Backend schema

Collections + fields are created by `scripts/setup-pocketbase.mjs` (run via
`pnpm db:setup`) and seeded by `scripts/seed-pocketbase.mjs` (`pnpm db:seed`). The
schema is derived from the stores' create/map calls. See `SETUP_GUIDE.md`.

> The setup rules are **authenticated-only** (dev/E2E grade). Harden them
> (per-collection ownership/role rules) before production.

## Testing

- **Unit** (`pnpm test:unit`, Vitest): pure store/util logic — whiteboard, presence,
  theme, toast, spotify, mappers, validation schemas.
- **E2E** (`pnpm test:e2e`, Playwright):
  - `auth/chat/rooms/validation.spec` — smoke + client-side validation, **no backend**.
  - `authenticated.spec` — real login → chat send + whiteboard draw; **requires** a
    seeded PocketBase; auto-skips if PB is down.
- **Green checks ≠ working**: prefer a Playwright test that drives the real browser
  for any behavior that matters. (The Svelte/Playwright MCP servers are configured in
  the repo-root `.mcp.json`.)

## Adding a feature (checklist)

1. Types in `lib/types`; a Valibot schema in `validation/schemas.ts` if it takes input.
2. State/actions in a runes store (`lib/stores/*.svelte.ts`); map PB records via
   `mappers.ts`/a `mapToX`; reuse `authStore` role getters.
3. UI in `lib/components/<feature>/`; validate input with `validateWithSchema`.
4. Run `svelte-autofixer` (Svelte MCP) on each component until clean.
5. Tests: unit for pure logic, a Playwright flow for the user-visible behavior.
6. Gates: `pnpm lint && pnpm check && pnpm test:unit && pnpm build` (+ e2e).

## Known limitations / intentional stubs

These need backend/product decisions, not bug fixes:

- Cross-user **typing indicators** are local-only (no realtime channel yet).
- **Notification unread** tracking and private-chat **lastMessage** need extra schema.
- **Kick/ban** moderation and **LinkedIn/X OAuth** are not implemented.
- Chat image/file attachments embed a capped **data URL** (no object storage yet).
- `CreateRoomModal` uses a hardcoded `tenant: 'default-tenant'`.
