# Architecture

Client-only application. No backend, no API routes. State lives in `localStorage`.

```
UI (atoms · molecules · organisms)
        │
   Zustand store ── Zod validation
        │
   StorageEngine ── migrations
        │
   localStorage

ErrorBoundary + CircuitBreaker   PerformanceMonitor   MonitoringService
        └────────────── all wrap the UI ──────────────┘
```

## Structure

| Path | Purpose |
|---|---|
| `src/app/` | App Router: page, layout, providers, `globals.css`, error/loading, ui-showcase |
| `src/components/` | Atomic design — atoms, molecules, organisms |
| `src/core/storage/` | `StorageEngine`, schema migrations, quota |
| `src/core/validation/` | Zod schemas and error handling |
| `src/core/monitoring/` | `MonitoringService`, `OfflineQueue`, `DataRedaction` |
| `src/core/error-boundary/` | `ErrorBoundary`, fallbacks, `CircuitBreaker` |
| `src/core/performance/` | `PerformanceMonitor`, budgets, banner, hooks, alerts |
| `src/store/` | Zustand store with persistence |
| `src/lib/` | SSR-safe helpers, performance bridge |

## Subsystems

**StorageEngine** — persists to `localStorage` with schema versioning and migrations. Enumeration uses the Storage API (`length`/`key(i)`), never `Object.keys`. Session/IndexedDB adapters exist but aren't the default.

**Validation** — Zod schemas for habits, users, and settings. Custom error classes carry structured context.

**Monitoring** — in-house service collecting events with an offline queue and PII redaction. User IDs are SHA-256 hashed.

**Performance** — Core Web Vitals against configurable budgets. Breaches surface through a violation banner, hook, and alert component.

**Error handling** — class-based error boundaries with layered fallbacks plus a circuit breaker. The boundary shows its fallback as soon as `hasError` is set, never gated on `errorInfo`.

## Patterns

- **Atomic design** — atoms → molecules → organisms
- **Separation of concerns** — business logic in `core/`, presentation in `components/`
- **Hydration safety** — persisted state is gated behind a mount check so SSR and the first client render are identical
- **Type safety** — strict TypeScript with `noUncheckedIndexedAccess`, plus runtime validation

## Key flows

1. Add a habit → Zod validates → store updates → `StorageEngine` writes to `localStorage`
2. A habit completes → store records it → analytics and streaks recompute
3. A render throws → nearest boundary catches → fallback renders
4. A Web Vital exceeds budget → monitor records a breach → banner surfaces it

## Stack

Next.js 16 (App Router, Turbopack) · React 18 · TypeScript strict · Tailwind CSS v4 with class-based dark mode · next-themes · Zustand + Immer · Zod · Vitest + Testing Library
