# Contributing

## Setup

```bash
npm install
npm run dev
```

## Before a pull request

CI is not configured yet, so run the gates yourself:

```bash
npx tsc --noEmit   # types
npm run lint       # lint (0 errors expected)
npm run test:run   # tests
```

## Rules

- **Commits** — [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`).
- **Types** — strict mode with `noUncheckedIndexedAccess`; guard possibly-undefined access.
- **Tests** — add or update Vitest tests for behavior changes.
- **Styling** — use the `slate-*` + `dark:` palette convention. Dark mode is class-based via `@custom-variant dark` in `src/app/globals.css`.
- **Data** — schema changes go in `src/core/storage` as migrations, not ad-hoc keys; validate shapes with Zod.
- **Hydration** — never read `localStorage` during initial render; use the `skipHydration` + mount-gate pattern in `src/app/providers.tsx`.
- **Docs** — keep them honest. Update `README.md` and `PROJECT_STATUS.md` when features or the stack change.
