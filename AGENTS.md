# AGENTS.md

Guidance for AI coding agents in this repo. Keep it accurate as the project evolves.

## What this is

Local-first, client-side habit tracker. **Next.js 16** (App Router, Turbopack), **React 18**, **TypeScript (strict)**, **Tailwind CSS v4**. Data persists to `localStorage` via a custom `StorageEngine` with schema versioning and migrations. **No backend or API routes.** Validation is **Zod**; theming is **next-themes**.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Serve build | `npm start` |
| Tests | `npm run test:run` |
| Tests + coverage | `npm run test:coverage` |
| Lint / autofix | `npm run lint` / `npm run lint:fix` |
| Type-check | `npx tsc --noEmit` |
| Unused code | `npm run knip` |

Run `npx tsc --noEmit`, `npm run lint`, and `npm run test:run` before finishing a change. `next build` also type-checks and statically generates `/`, `/_not-found`, and `/ui-showcase`.

## Conventions

**Dark mode is class-based.** `src/app/globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))`, so `dark:` utilities respond to the `.dark` class set by next-themes — not `prefers-color-scheme`.

**Design tokens** live in `globals.css` (`:root`/`.dark` HSL vars) and are exposed to Tailwind via `@theme inline`. Prefer the `slate-*` + `dark:` palette convention in components.

**Strict TS** — `strict` and `noUncheckedIndexedAccess` are on. Guard possibly-undefined array and record access.

**Storage** — read and write through `StorageEngine`. Schema changes go in as migrations, never ad-hoc keys. Key enumeration must use the Storage API (`length`/`key(i)`), never `Object.keys`.

**Error boundaries** — show the fallback as soon as `hasError` is set; do not gate the render on `errorInfo`. Boundaries only catch render and lifecycle errors, not async callbacks — surface async errors by throwing on the next render.

**Hydration** — never read `localStorage`, `Date.now()`, `Math.random()`, or `window` during the initial render of an SSR'd component. Persisted store state uses `skipHydration` (`src/store/habit-store.ts`) plus a mount gate in `src/app/providers.tsx`, so the server HTML and the client's first render are identical.

**Tests** — Vitest (flat config, `globals: true`, jsdom). The setup mocks `Storage`/`localStorage`, `PerformanceObserver`, `fetch`, and `matchMedia`. Chaos tests patch globals: keep originals and restore them. Retry and circuit-breaker logic uses timers — advance fake timers inside `act`.

**Coverage thresholds** are configured in `vitest.config.ts`, targeting `src/lib`, `src/components/atoms`, and `src/components/molecules`.

## Known limitations

- No backend or API routes; no cloud sync; data stays on-device.
- No data-at-rest encryption (the storage `encryption` option is a metadata flag only).
- No service worker — installable PWA, but the shell isn't fully offline.
- Storybook configured with no stories; no CI workflows in `.github/`.
- Treat `README.md` and `PROJECT_STATUS.md` as the current state.
