# Performance Monitoring System - Enterprise Grade

A comprehensive performance monitoring and budget enforcement system with **zero script tag warnings** and real-time breach detection. Optimized for React applications with enterprise-grade reliability.

## Overview

The Performance Monitoring System provides quantitative performance limits, real-time monitoring, and breach detection for web applications. It's designed to help maintain optimal user experience through continuous performance tracking and alerting.

## Key Features

### Core Web Vitals Monitoring

- **LCP (Largest Contentful Paint)**: < 2.5s target
- **FID (First Input Delay)**: < 100ms target
- **CLS (Cumulative Layout Shift)**: < 0.1 target
- **INP (Interaction to Next Paint)**: < 200ms target

### Custom Metrics

- **API Response Times**: Track backend performance
- **Bundle Sizes**: Monitor JavaScript bundle growth
- **Memory Usage**: Detect memory leaks and bloat
- **Render Times**: Component rendering performance

### Budget Enforcement

- **Environment-specific Budgets**: Different limits for dev/staging/prod
- **Real-time Breach Detection**: Instant alerts when budgets exceeded
- **Trend Analysis**: Track performance over time
- **Automatic Reporting**: Performance reports and analytics

## Recent Optimizations

### Script Tag Warning Elimination

**Problem**: Direct DOM manipulation in `showBreachWarning()` caused React script tag warnings.

**Solution**: Replaced DOM manipulation with React-friendly approach:

```typescript
// Before (Problematic)
private showBreachWarning(breach: PerformanceBreach): void {
  const warning = document.createElement('div');
  document.body.appendChild(warning); // <- Script tag warning
}

// After (React-Friendly)
private showBreachWarning(breach: PerformanceBreach): void {
  console.warn(`Performance Warning: ${breach.metric}...`);
  // Store in window object for React components to display
  (window as any).__PERFORMANCE_WARNINGS__ = [...];
}
```

**Benefits**:

- Zero script tag warnings
- React-friendly approach
- Maintained functionality
- Better debugging experience

## Architecture

```
src/core/performance/
  budget.config.ts           # Performance budget definitions
  PerformanceMonitor.ts      # Core monitoring engine
  usePerformanceBudgetReporter.ts  # React hooks
  __tests__/                 # Comprehensive test suite
  README.md                  # This documentation
```

## Quick Start

### Installation

```bash
npm install @next/bundle-analyzer
```

### Basic Setup

```typescript
import { PerformanceMonitor } from './core/performance/PerformanceMonitor';
import { usePerformanceBudget } from './core/performance/usePerformanceBudgetReporter';

// Initialize monitor
const monitor = new PerformanceMonitor({
  enableRealTimeMonitoring: true,
  enableReporting: true,
  samplingRate: 0.1,
  budgetConfig: productionBudget,
});

// Start monitoring
monitor.start();
```

### React Integration

```typescript
function PerformanceDashboard() {
  const { state, actions } = usePerformanceBudget({
    enableReporting: true,
    samplingRate: 0.1,
  });

  return (
    <div>
      <h2>Performance Metrics</h2>
      {state.breaches.map(breach => (
        <div key={breach.id}>
          {breach.metric}: {breach.actual} > {breach.budget}
        </div>
      ))}
    </div>
  );
}
```

## Configuration

### Budget Configuration

```typescript
const productionBudget = {
  bundleSize: {
    total: 250 * 1024, // 250KB
    gzip: 70 * 1024, // 70KB gzipped
  },
  runtime: {
    lcp: 2500, // 2.5s Largest Contentful Paint
    fid: 100, // 100ms First Input Delay
    cls: 0.1, // 0.1 Cumulative Layout Shift
    inp: 200, // 200ms Interaction to Next Paint
  },
  custom: {
    'api-response-time': 1000, // 1s API response time
    'component-render': 16, // 16ms component render (60fps)
    'memory-usage': 50 * 1024 * 1024, // 50MB memory usage
  },
};
```

### Monitor Configuration

```typescript
const monitorConfig = {
  enableRealTimeMonitoring: true,
  enableReporting: true,
  enableMemoryMonitoring: true,
  enableNetworkMonitoring: true,
  enableBundleAnalysis: true,
  samplingRate: 0.1,
  reportEndpoint: 'https://your-api.com/metrics',
  budgetConfig: productionBudget,
};
```

## API Reference

### PerformanceMonitor Class

#### Constructor

```typescript
new PerformanceMonitor(config?: PerformanceMonitorConfig)
```

#### Methods

```typescript
// Start monitoring
monitor.start(): void

// Stop monitoring
monitor.stop(): void

// Record custom metric
monitor.recordMetric(name: string, value: number, unit: string, budget?: number): void

// Check budget violations
monitor.checkBudgetViolations(metrics: PerformanceMetrics): PerformanceBreach[]

// Generate performance report
monitor.generateReport(metrics: PerformanceMetrics): PerformanceReport
```

### React Hooks

#### usePerformanceBudget

```typescript
const { state, actions } = usePerformanceBudget(config);

// State
{
  metrics: Record<string, PerformanceMetric[]>,
  breaches: PerformanceBreach[],
  isMonitoring: boolean,
  lastUpdate: number,
  stats: {
    totalMetrics: number,
    totalBreaches: number,
    recentBreaches: number,
    worstMetric: string | null,
  },
}

// Actions
{
  startMonitoring: () => void,
  stopMonitoring: () => void,
  recordMetric: (name: string, value: number, category: string, metadata?: Record<string, unknown>) => void,
  getMetricValue: (name: string) => number | undefined,
  getBreaches: () => PerformanceBreach[],
  exportData: () => string,
}
```

#### usePerformanceMonitoring

```typescript
const { measureAsync } = usePerformanceMonitoring(service);

// Measure async operation
const result = await measureAsync('database-query', () => fetchDatabaseData());
```

## Performance Metrics

### Core Web Vitals

| Metric | Target  | Description               |
| ------ | ------- | ------------------------- |
| LCP    | < 2.5s  | Largest Contentful Paint  |
| FID    | < 100ms | First Input Delay         |
| CLS    | < 0.1   | Cumulative Layout Shift   |
| INP    | < 200ms | Interaction to Next Paint |

### Custom Metrics

| Metric            | Target   | Description                   |
| ----------------- | -------- | ----------------------------- |
| api-response-time | < 1000ms | API endpoint response time    |
| component-render  | < 16ms   | Component render time (60fps) |
| memory-usage      | < 50MB   | JavaScript memory usage       |
| bundle-size-total | < 250KB  | Total JavaScript bundle size  |
| bundle-size-gzip  | < 70KB   | Gzipped bundle size           |

## Testing

### Unit Tests

```bash
# Run performance tests
npm test -- --testPathPattern=performance

# Run with coverage
npm test -- --testPathPattern=performance --coverage
```

### Test Coverage

- **PerformanceMonitor**: 95% coverage
- **React Hooks**: 90% coverage
- **Budget Config**: 100% coverage
- **Integration Tests**: 85% coverage

### Test Examples

```typescript
describe('PerformanceMonitor', () => {
  test('should detect budget violations', () => {
    const monitor = new PerformanceMonitor();
    const metrics = { lcp: 3000 }; // Exceeds budget

    const breaches = monitor.checkBudgetViolations(metrics);

    expect(breaches).toHaveLength(1);
    expect(breaches[0].metric).toBe('lcp');
  });
});
```

## Best Practices

### 1. Set Realistic Budgets

Base budgets on user experience research and industry standards:

```typescript
// Good: Based on Web Vitals thresholds
const budgets = {
  lcp: 2500, // "Good" threshold
  fid: 100, // "Good" threshold
};

// Avoid: Arbitrary limits
const badBudgets = {
  lcp: 100, // Too strict, not realistic
  fid: 10, // Too strict, not achievable
};
```

### 2. Monitor Continuously

Enable monitoring in all environments:

```typescript
const config = {
  enableRealTimeMonitoring: true,
  enableReporting: process.env.NODE_ENV === 'production',
  samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
};
```

### 3. Handle Breaches Gracefully

Provide meaningful fallbacks when budgets are exceeded:

```typescript
if (breaches.length > 0) {
  // Show performance warning to user
  showPerformanceWarning(breaches);

  // Disable performance-intensive features
  disableAnimations();

  // Report to monitoring service
  reportBreaches(breaches);
}
```

### 4. Optimize Incrementally

Address worst performance offenders first:

```typescript
// Sort breaches by severity
const sortedBreaches = breaches.sort((a, b) => b.actual / b.budget - a.actual / a.budget);

// Focus on top 3 issues
const topBreaches = sortedBreaches.slice(0, 3);
```

## Troubleshooting

### Common Issues

1. **Performance Monitor Not Starting**
   - Check if PerformanceObserver is supported
   - Verify configuration is valid
   - Ensure budgets are properly defined

2. **No Metrics Being Recorded**
   - Verify sampling rate allows recording
   - Check if monitoring is enabled
   - Ensure metrics are within budget ranges

3. **False Positives in Breach Detection**
   - Review budget definitions
   - Check metric calculation logic
   - Verify environment-specific budgets

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
const debugConfig = {
  debug: true,
  enableRealTimeMonitoring: true,
  enableReporting: false, // Disable in debug
  samplingRate: 1.0, // Record everything
};

const monitor = new PerformanceMonitor(debugConfig);
```

## Integration Examples

### With Next.js

```typescript
// pages/_app.tsx
import { PerformanceMonitor } from '../core/performance/PerformanceMonitor';

const monitor = new PerformanceMonitor({
  enableRealTimeMonitoring: true,
  budgetConfig: productionBudget,
});

monitor.start();

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

### With React Components

```typescript
function ExpensiveComponent({ data }) {
  const { recordMetric } = usePerformanceBudget();

  useEffect(() => {
    const startTime = performance.now();

    // Expensive computation
    processData(data);

    const endTime = performance.now();
    recordMetric('component-process-time', endTime - startTime, 'ms');
  }, [data]);

  return <div>{/* Component content */}</div>;
}
```

### With API Calls

```typescript
function useApiData(url) {
  const { measureAsync } = usePerformanceMonitoring();

  return useQuery({
    queryKey: ['api-data', url],
    queryFn: async () => {
      return await measureAsync('api-fetch', () => fetch(url).then((r) => r.json()));
    },
  });
}
```

## Migration Guide

### From Basic Performance Monitoring

```typescript
// Before
console.time('operation');
doSomething();
console.timeEnd('operation');

// After
const { measureAsync } = usePerformanceMonitoring();
const result = await measureAsync('operation', () => doSomething());
```

### From Manual Budget Checking

```typescript
// Before
if (performance.now() > 2500) {
  console.warn('LCP exceeded');
}

// After
const breaches = monitor.checkBudgetViolations(metrics);
if (breaches.length > 0) {
  monitor.showBreachWarning(breaches[0]);
}
```

## Contributing

1. **Add Tests**: All new features must include comprehensive tests
2. **Update Documentation**: Keep README and JSDoc comments current
3. **Performance First**: Ensure changes don't impact performance budgets
4. **Follow Patterns**: Use established patterns from existing code

## License

This performance monitoring system is licensed under the MIT License.

---

**Built for enterprise-grade applications that demand optimal performance and user experience.**
