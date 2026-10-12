# Project Status

Verified state. Older root-level reports were removed — this file and `README.md` are authoritative.

## Gates

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ Compiles, type-checks, prerenders `/`, `/_not-found`, `/ui-showcase` |
| Types | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings |
| Tests | `npm run test:run` | ✅ 326 / 326 across 111 files |
| Coverage | `npm run test:coverage` | ⚠️ **Fails.** Real all-source coverage is ~30% statements / 23% branches; the config's `include` omits `src/core` (where the tests live) and demands 100%, so it reports ~0.6% and exits 1 |

## Recent fixes

| Area | Fix |
|---|---|
| **Dark mode** | Tailwind v4 `dark:` defaults to `prefers-color-scheme`; added `@custom-variant dark (&:where(.dark, .dark *))` so the `.dark` class drives all `dark:*` utilities |
| **Theme flash** | `ThemeProvider` now renders unconditionally (`defaultTheme="system"`) |
| **Tokens** | HSL tokens exposed via `@theme inline`; `color-scheme` set per theme |
| **HabitForm footer** | Was hardcoded `bg-white` in dark mode → added `dark:` variants |
| **Switch track** | `data-[state=unchecked]` overrode `dark:`; replaced with `dark:data-[state=unchecked]` |
| **Error boundary** | Fallback was gated on `errorInfo`, letting errors escape; now shows as soon as `hasError`. Circuit breaker was always one error behind. Retry cap now honors `retryAttempts` |
| **Monitoring** | Init system event was dropped; captured events were never stored; events now capped and cleared on `cleanup()`/`clearData()` |
| **Data redaction** | Stack overflow on circular refs fixed; `seen` is now path-scoped so shared non-cyclic refs still redact |
| **Storage** | `keys()` used `Object.keys(storage)` (empty for the Storage API); now iterates `length`/`key(i)` |
| **Responsive** | BadgesModal filter row clipped on mobile → `flex-wrap`; banner rows hardened |
| **Hydration** | `isOnline` seeded from `navigator.onLine` vs `true` → optimistic `true`. Persisted store client vs SSR → `skipHydration` + mount gate |

> **Rule:** never read localStorage-backed state during the initial render.

## Implemented

Habit tracking · streaks · analytics · gamification · local-first persistence with migrations · JSON/CSV export · light/dark/system theming · monitoring with offline queue and PII redaction · error boundaries and circuit breaker · Web Vitals budgets · PWA icons.

## Known limitations

| | |
|---|---|
| Backend | None — client-only, no API routes |
| Sync | None — data stays on-device |
| Encryption | Metadata flag only; no data-at-rest encryption |
| Offline | No service worker — installable but the shell isn't fully offline |
| Storybook | Configured, no stories yet |
| CI | No workflows in `.github/` |

## Follow-ups

1. Add CI (build + lint + test)
2. Add Storybook stories
