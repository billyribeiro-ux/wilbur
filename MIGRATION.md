# Migration: React to Svelte

## Overview
This project has transitioned from a React-based application to a SvelteKit-based application. The original React version has been archived for reference.

## Timeline
- **Original Version**: React 18 + Vite (revolution-app)
- **Current Version**: SvelteKit 2 (wilbur-trading-room)
- **Migration Date**: March 2026
- **Package Manager**: pnpm (Corepack / `packageManager` in `package.json`)

## Archive Location
The original React application is preserved in:
- **Git Branch**: `archive/react-app-pre-svelte-migration`
- **Backup Config**: `legacy/react-app/package.json.bak`

To access the React version:
```bash
git checkout archive/react-app-pre-svelte-migration
```

## Current Structure

### Active Application
- **Location**: `wilbur-svelte/`
- **Framework**: SvelteKit 2
- **UI**: Skeleton UI, Phosphor icons
- **Backend**: PocketBase
- **Database**: LibSQL/Turso

### Supporting Services
- **API**: `wilbur-api/` (Rust-based backend)

## Development Commands

All commands now proxy to the Svelte app:

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:host         # Start with network access

# Building
pnpm build            # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Lint code
pnpm lint:fix         # Fix linting issues
pnpm format           # Format with Prettier

# Testing
pnpm test             # Run tests
pnpm test:unit        # Unit tests
pnpm test:e2e         # E2E tests

# Database
pnpm pocketbase:start # Start PocketBase
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
```

## Key Differences

### React Version (Archived)
- Fluent UI + FontAwesome + Lucide icons
- Zustand for state management
- React Router v7
- Vite build system
- 87 dependencies

### Svelte Version (Current)
- Skeleton UI + Phosphor icons
- SvelteKit built-in state management
- SvelteKit routing
- Vite build system (SvelteKit)
- Lighter dependency footprint
- Better performance
- Simpler component model

## Migration Notes

### What Was Kept
- Core business logic
- API integration patterns
- LiveKit video integration
- Database schemas
- Test infrastructure (Playwright, Vitest)

### What Changed
- UI framework (React → Svelte)
- Component architecture
- State management approach
- Routing system
- Backend (Supabase → PocketBase)

## Rollback Plan

If you need to return to the React version:

1. Checkout the archive branch:
   ```bash
   git checkout archive/react-app-pre-svelte-migration
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development:
   ```bash
   pnpm dev
   ```

## Future Development

All new development should focus on the SvelteKit application in `wilbur-svelte/`. The React version is considered legacy and will not receive updates.

## Questions?

Refer to the archive branch for the complete React implementation or check the Svelte app's README for current development guidelines.
