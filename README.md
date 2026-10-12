# Habit Tracker

Local-first habit tracking that runs entirely in the browser. No backend, no accounts — your data stays on your device.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-326%20passing-2E7D32?style=flat&logo=vitest)](https://vitest.dev/)
[![MIT](https://img.shields.io/badge/license-MIT-3DA639?style=flat)](LICENSE)

## Status

| Build | Types | Lint | Tests |
|-------|-------|------|-------|
| ✅ | ✅ 0 errors | ✅ 0 errors, 0 warnings | ✅ 326 / 326 |

> `npm run test:coverage` currently **fails**: the coverage config excludes `src/core`
> (where the tests live), sets 100% thresholds, and reports ~0.6%. See
> [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Features

- **Habit tracking** — recurrence, streaks, completion state
- **Analytics** — category breakdown, streaks, completion rate (custom d3 charts)
- **Gamification** — achievements and a badges modal
- **Local-first** — persists to `localStorage` with versioned schema migrations
- **Export** — JSON and CSV
- **Theming** — light / dark / system
- **PWA** — installable, with generated icons
- **Resilience** — error boundaries, circuit breaker, Core Web Vitals budgets

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 18, Tailwind CSS v4, lucide-react |
| **State** | Zustand + Immer |
| **Storage** | `localStorage` via custom `StorageEngine` (+ migrations) |
| **Validation** | Zod |
| **Theming** | next-themes (class-based dark mode) |
| **Testing** | Vitest 4, Testing Library |
| **Lint** | ESLint 9 (flat), Prettier |

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables required.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (types + static generation) |
| `npm start` | Serve the production build |
| `npm run test:run` | Unit & integration tests |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run lint` · `lint:fix` | ESLint |
| `npx tsc --noEmit` | Type-check |
| `npm run knip` | Unused files, exports, deps |
| `ANALYZE=true npm run build` | Build with bundle analyzer |

## Structure

```
src/
├── app/          Routes, layout, providers, globals.css, ui-showcase
├── components/   atoms · molecules · organisms
├── contracts/    Type contracts
├── core/         storage · validation · monitoring · error-boundary · performance
├── hooks/        useDragAndDrop, useAnimationState
├── lib/          SSR-safe helpers, performance bridge
├── store/        Zustand store
└── types/        Shared types
```

**Data flow:** UI → Zustand store → `StorageEngine` → `localStorage`, with Zod validation at the boundary and error boundaries above the UI.

**Dark mode:** `globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))` so every `dark:` utility follows the `.dark` class set by `next-themes`. Tokens are HSL vars in `:root`/`.dark`, exposed via `@theme inline`.

**Hydration:** persisted state uses `skipHydration` plus a mount gate in `src/app/providers.tsx`, so the server HTML and the client's first render are identical. Never read `localStorage` during initial render.

## Known limitations

- No backend or API routes — client-only.
- No cloud sync; data stays on-device.
- No data-at-rest encryption (the storage `encryption` option is a metadata flag only).
- No service worker — installable PWA, but the shell isn't fully offline.
- Storybook configured, no stories yet. No CI workflows.

## Docs

| | |
|---|---|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Verified gates and recent fixes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture and subsystems |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [AGENTS.md](./AGENTS.md) | Guidance for AI coding agents |

## License

[MIT](./LICENSE)
