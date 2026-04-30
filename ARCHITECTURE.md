# Architecture Overview

## Directory Structure

- `app/` – Next.js App Router pages and layouts
- `components/` – Atomic design components (atoms, molecules, organisms)
- `core/` – Business logic subsystems:
  - `storage/` – Multi‑backend persistence with migration engine
  - `validation/` – Zod schemas and error handling
  - `monitoring/` – Performance and error monitoring
  - `error-boundary/` – Fault‑isolated error recovery
  - `performance/` – Budget tracking and optimization
- `lib/` – Shared utilities and helpers
- `store/` – Zustand state management with persistence
- `types/` – Global TypeScript type definitions
- `contracts/` – Type contracts and interfaces

## Design Patterns

- **Atomic Design**: Components are organized into atoms, molecules, and organisms for reusability.
- **Separation of Concerns**: Core business logic is separated from UI components.
- **Type Safety**: All code is strictly typed with TypeScript; Zod provides runtime validation.
- **State Management**: Zustand stores are persisted to localStorage and support partialization.
- **Error Isolation**: Error boundaries and circuit breakers prevent cascading failures.
- **Performance Budgeting**: Proactive monitoring with configurable budgets and alerts.

## Key Flows

1. User adds a habit → validated by Zod schema → stored in StorageEngine (IndexedDB/localStorage).
2. Performance metrics are tracked by PerformanceMonitor and reported when budgets are breached.
3. Monitoring telemetry is collected (with privacy controls) and can be sent to external services.
4. Validation errors are caught by error boundaries and displayed with user-friendly messages.

## Core Subsystems

### Storage Engine

- Multi-backend support (IndexedDB, localStorage, future API)
- Migration engine for schema changes
- Type-safe operations with TypeScript

### Validation Layer

- Zod schemas for runtime validation
- Custom error classes with detailed context
- Form integration utilities

### Performance Monitoring

- Budget-based performance tracking
- Real-time metrics collection
- Privacy-first telemetry

### Error Handling

- Circuit breaker pattern for resilience
- Error boundaries for UI isolation
- Structured error reporting

## Future Backend Integration

The storage engine is designed to swap from client‑side stores to API calls without affecting the UI layer. All state is managed through a unified Zustand interface, ready for a backend.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **State**: Zustand with persistence
- **Validation**: Zod schemas
- **Testing**: Vitest with React Testing Library
- **Build**: Next.js optimized builds
