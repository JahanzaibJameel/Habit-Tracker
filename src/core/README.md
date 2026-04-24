# Enterprise Frontend Foundation

A chaos-resistant, enterprise-grade 100% frontend foundation that guarantees stability, data integrity, observability, and maintainability under extreme conditions.

## Overview

This foundation provides five cohesive subsystems that work together to create a robust, production-ready frontend infrastructure:

1. **Real Schema Validation System** - Type-safe data validation with Zod
2. **Storage Migration Engine** - Versioned storage with automatic migrations
3. **Advanced Error Isolation Tree** - Hierarchical error boundaries with recovery
4. **Performance Budget System** - Quantitative performance limits and monitoring
5. **Production Monitoring Layer** - Unified telemetry with privacy-preserving features

## Architecture

```
src/core/
 validation/          # Schema validation and type safety
  schemas.ts         # Zod schema definitions
  errors.ts          # Custom error classes
  fetcher.ts         # Type-safe API client
  useSafeForm.ts     # React form validation hook

 storage/            # Data persistence and migration
  StorageEngine.ts   # Main storage engine
  useStorage.ts      # React storage hooks
  migrations/        # Migration definitions
    settings.migrations.ts
    habits.migrations.ts

 error-boundary/     # Error isolation and recovery
  ErrorBoundary.tsx  # Main error boundary component
  withErrorBoundary.tsx  # HOC for automatic wrapping
  ErrorContext.tsx   # Global error context

 performance/        # Performance monitoring and budgets
  budget.config.ts   # Performance budget definitions
  PerformanceMonitor.ts  # Real-time performance tracking
  usePerformanceBudgetReporter.ts  # React hooks

 monitoring/         # Unified telemetry system
  types.ts           # Type definitions
  adapters/          # Backend adapters
    SentryAdapter.ts
    ConsoleAdapter.ts
  MonitoringService.ts  # Main monitoring service
  useMonitoring.ts   # React hooks
```

## Quick Start

### Installation

```bash
npm install zod @sentry/browser
```

### Basic Setup

```typescript
import { ErrorBoundaryProvider } from './core/error-boundary/ErrorContext';
import { MonitoringService } from './core/monitoring/MonitoringService';
import { createStorageEngine } from './core/storage/StorageEngine';

// Initialize monitoring
const monitoringService = new MonitoringService({
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  enabled: true,
  adapter: new SentryAdapter(),
  samplingRate: 0.1,
});

// Initialize storage
const storage = createStorageEngine({
  backend: 'localStorage',
  keyPrefix: 'myapp',
  schema: UserSettingsSchema,
  currentVersion: 1,
  migrations: userSettingsMigrations,
  defaultValue: defaultUserSettings,
});

// Wrap your app
function App() {
  return (
    <ErrorBoundaryProvider>
      <YourAppComponents />
    </ErrorBoundaryProvider>
  );
}
```

## Subsystems

### 1. Real Schema Validation System

Provides runtime type safety with Zod schemas and automatic type inference.

#### Features
- **Schema Definitions**: Centralized Zod schemas for all data shapes
- **Type Inference**: Automatic TypeScript types from schemas
- **Safe Fetch**: Type-safe API client with validation
- **Form Validation**: React hooks with real-time validation
- **Error Handling**: Custom error classes with detailed context

#### Usage

```typescript
import { UserSchema, safeFetchJson } from './core/validation';

// Type-safe API call
const user = await safeFetchJson('/api/user/123', UserSchema);

// Form validation
const { state, actions } = useSafeForm(UserSchema, {
  initialValues: defaultUser,
  onSubmit: handleSubmit,
});
```

### 2. Storage Migration Engine

Versioned data storage with automatic migrations for localStorage, IndexedDB, and sessionStorage.

#### Features
- **Multi-backend Support**: localStorage, sessionStorage, IndexedDB
- **Automatic Migrations**: Version-based data transformation
- **Type Safety**: Schema validation on read/write
- **React Integration**: Reactive hooks with real-time updates
- **Offline Support**: Queue and retry mechanisms

#### Usage

```typescript
import { useStorage } from './core/storage/useStorage';

const { state, actions } = useStorage('userSettings', storageConfig, {
  syncAcrossTabs: true,
  debounceMs: 500,
});

// Automatic migration handling
const migratedData = await storage.get('userSettings');
```

### 3. Advanced Error Isolation Tree

Hierarchical error boundaries that prevent cascading failures and provide recovery strategies.

#### Features
- **Hierarchical Isolation**: Errors contained to smallest UI subtree
- **Recovery Strategies**: Retry, reset, fallback, ignore, escalate
- **Circuit Breaker**: Automatic throttling of repeated failures
- **Context Integration**: Global error reporting and recovery coordination
- **Development Tools**: Detailed error information in development

#### Usage

```typescript
import { ErrorBoundary, withErrorBoundary } from './core/error-boundary';

// Component wrapping
<ErrorBoundary
  id="critical-component"
  retryAttempts={3}
  fallback={<ErrorFallback />}
>
  <CriticalComponent />
</ErrorBoundary>

// HOC usage
const SafeComponent = withErrorBoundary(RiskyComponent, {
  id: 'risky-component',
  retry: true,
});
```

### 4. Performance Budget System

Quantitative performance limits with real-time monitoring and breach detection.

#### Features
- **Core Web Vitals**: LCP, FID, CLS, INP tracking
- **Custom Metrics**: Application-specific performance metrics
- **Budget Enforcement**: Automatic breach detection and alerting
- **Environment-specific**: Different budgets for dev/staging/prod
- **React Integration**: Real-time performance dashboards

#### Usage

```typescript
import { usePerformanceBudget } from './core/performance';

const { state, actions } = usePerformanceBudget({
  enableReporting: true,
  samplingRate: 0.1,
});

// Manual metric recording
actions.recordMetric('api-response-time', 150, 'ms', 100);

// Automatic performance measurement
const { measureAsync } = usePerformanceMonitoring(service);
const result = await measureAsync('database-query', () => 
  fetchDatabaseData()
);
```

### 5. Production Monitoring Layer

Unified telemetry system with privacy-preserving features and backend-agnostic adapters.

#### Features
- **Multiple Adapters**: Sentry, console, custom backends
- **Privacy-First**: Data redaction and user ID hashing
- **Event Types**: Errors, performance, user actions, business events
- **Offline Queue**: Reliable delivery during network issues
- **Context Enrichment**: Automatic context addition and filtering

#### Usage

```typescript
import { useMonitoring } from './core/monitoring';

const { state, actions } = useMonitoring(monitoringConfig);

// Error tracking
actions.captureError(error, { component: 'UserProfile' });

// Performance tracking
actions.capturePerformance('page-load', 1200, 'ms', 1000);

// User action tracking
actions.captureUserAction('click', 'submit-button', { form: 'login' });

// Business events
actions.captureBusiness('purchase', { productId: '123', amount: 99.99 }, 99.99, 'USD');
```

## Configuration

### Environment Variables

```bash
# Sentry integration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Monitoring configuration
MONITORING_ENABLED=true
MONITORING_SAMPLING_RATE=0.1
MONITORING_DEBUG=false

# Performance budgets
PERFORMANCE_ENVIRONMENT=production
PERFORMANCE_REPORTING_ENDPOINT=https://your-api.com/metrics
```

### Default Configurations

```typescript
// Production performance budgets
const productionBudget = {
  bundleSize: {
    total: 250 * 1024, // 250KB
    gzip: 70 * 1024,   // 70KB gzipped
  },
  runtime: {
    lcp: 2500,    // 2.5s Largest Contentful Paint
    fid: 100,     // 100ms First Input Delay
    cls: 0.1,     // 0.1 Cumulative Layout Shift
  },
  // ... more budgets
};

// Development budgets (more lenient)
const developmentBudget = {
  // ... relaxed limits for development
};
```

## Best Practices

### Error Handling

1. **Wrap Components**: Use error boundaries around risky components
2. **Provide Fallbacks**: Always provide meaningful fallback UI
3. **Log Context**: Include relevant context when reporting errors
4. **Recovery Strategies**: Choose appropriate recovery strategies for each error type

### Performance

1. **Set Realistic Budgets**: Base budgets on user experience research
2. **Monitor Continuously**: Track performance in production
3. **Optimize Incrementally**: Address worst offenders first
4. **Test in Production**: Use RUM (Real User Monitoring) data

### Storage

1. **Version Everything**: Always include version numbers in schemas
2. **Write Migrations**: Provide forward and backward migrations
3. **Handle Failures**: Gracefully handle storage quota exceeded
4. **Validate Data**: Never trust stored data without validation

### Monitoring

1. **Sample Appropriately**: Use sampling to reduce overhead
2. **Redact Sensitive Data**: Never send PII to monitoring services
3. **Set Context**: Provide rich context for debugging
4. **Monitor the Monitor**: Ensure monitoring doesn't impact performance

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests for specific subsystem
npm test -- --testPathPattern=validation
npm test -- --testPathPattern=storage
npm test -- --testPathPattern=error-boundary
npm test -- --testPathPattern=performance
npm test -- --testPathPattern=monitoring

# Coverage report
npm test -- --coverage
```

## Migration Guide

### From Basic Error Handling

```typescript
// Before
try {
  riskyOperation();
} catch (error) {
  console.error(error);
}

// After
<ErrorBoundary id="risky-operation">
  <RiskyOperationComponent />
</ErrorBoundary>
```

### From Basic Storage

```typescript
// Before
localStorage.setItem('user', JSON.stringify(userData));
const user = JSON.parse(localStorage.getItem('user'));

// After
const { state, actions } = useStorage('user', userConfig);
const user = state.data;
actions.set(newUserData);
```

### From Basic Performance Monitoring

```typescript
// Before
console.time('operation');
doSomething();
console.timeEnd('operation');

// After
const result = await measureAsync('operation', () => doSomething());
```

## Troubleshooting

### Common Issues

1. **Schema Validation Errors**: Check that your data matches the Zod schema exactly
2. **Storage Quota Exceeded**: Implement data cleanup or use IndexedDB for larger datasets
3. **Performance Budget Breaches**: Use the performance dashboard to identify bottlenecks
4. **Error Boundary Not Catching**: Ensure errors are thrown in the render phase, not in effects

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const monitoringConfig = {
  debug: true,
  enableReporting: false, // Disable in debug
};

const performanceConfig = {
  debug: true,
  enableRealTimeMonitoring: true,
};
```

## Contributing

1. **Follow the Patterns**: Use established patterns from existing code
2. **Add Tests**: All new features must include comprehensive tests
3. **Update Documentation**: Keep README and JSDoc comments current
4. **Performance First**: Ensure changes don't impact performance budgets

## License

This frontend foundation is licensed under the MIT License.

## Support

For questions, issues, or contributions:

1. Check the test files for usage examples
2. Review the JSDoc comments in source files
3. Create an issue for bugs or feature requests
4. Join the discussion for architectural questions

---

**Built for enterprise-grade applications that demand reliability, performance, and maintainability.**
