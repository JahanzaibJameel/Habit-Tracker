/**
 * Performance monitoring utilities for production
 */

import { logger } from './logger';

// Web Vitals monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track custom performance metrics
  trackMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Log metric
    logger.performance(name, value, { metricType: 'custom' });

    // Keep only last 100 values to prevent memory leaks
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }

  // Measure function execution time
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.trackMetric(name, duration);
    return result;
  }

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.trackMetric(name, duration);
    return result;
  }

  // Get metric statistics
  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Initialize Web Vitals monitoring
  initWebVitals() {
    if (typeof window === 'undefined') return;

    // Load web-vitals library dynamically
    import('web-vitals')
      .then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        onCLS((metric) => {
          this.trackWebVital('CLS', metric);
        });

        onINP((metric) => {
          this.trackWebVital('INP', metric);
        });

        onFCP((metric) => {
          this.trackWebVital('FCP', metric);
        });

        onLCP((metric) => {
          this.trackWebVital('LCP', metric);
        });

        onTTFB((metric) => {
          this.trackWebVital('TTFB', metric);
        });
      })
      .catch((error) => {
        logger.error('Failed to load web-vitals', error);
      });
  }

  private trackWebVital(name: string, metric: any) {
    const value = metric.value;
    this.trackMetric(name, value);

    // Log performance warnings
    const thresholds: Record<string, number> = {
      CLS: 0.1,
      FID: 100,
      FCP: 1800,
      LCP: 2500,
      TTFB: 800,
    };

    if (thresholds[name] && value > thresholds[name]) {
      logger.warn(`Performance threshold exceeded for ${name}`, {
        value,
        threshold: thresholds[name],
        rating: metric.rating,
      });
    }
  }
}

// React Query performance monitoring
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private queryMetrics: Map<string, { count: number; totalTime: number; errors: number }> =
    new Map();

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  trackQuery(queryKey: string[], duration: number, success: boolean) {
    const key = JSON.stringify(queryKey);
    const current = this.queryMetrics.get(key) || { count: 0, totalTime: 0, errors: 0 };

    current.count++;
    current.totalTime += duration;
    if (!success) current.errors++;

    this.queryMetrics.set(key, current);

    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        queryKey,
        duration,
        success,
      });
    }
  }

  getQueryStats(queryKey: string[]) {
    const key = JSON.stringify(queryKey);
    const stats = this.queryMetrics.get(key);

    if (!stats) return null;

    return {
      ...stats,
      avgDuration: stats.totalTime / stats.count,
      errorRate: stats.errors / stats.count,
    };
  }
}

// Database performance monitoring
export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor;
  private operationMetrics: Map<string, number[]> = new Map();

  static getInstance(): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor();
    }
    return DatabasePerformanceMonitor.instance;
  }

  trackOperation(operation: string, duration: number) {
    if (!this.operationMetrics.has(operation)) {
      this.operationMetrics.set(operation, []);
    }
    this.operationMetrics.get(operation)!.push(duration);

    // Log slow database operations
    if (duration > 100) {
      logger.warn('Slow database operation', {
        operation,
        duration,
      });
    }
  }

  async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.trackOperation(operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackOperation(`${operation}_error`, duration);
      throw error;
    }
  }
}

// Performance monitoring hook for React
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  const trackRender = () => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      monitor.trackMetric(`${componentName}_render`, duration);
    };
  };

  const trackUserAction = (action: string) => {
    monitor.trackMetric(`${componentName}_${action}`, performance.now());
  };

  return {
    trackRender,
    trackUserAction,
  };
}

// Initialize performance monitoring
export const performanceMonitor = PerformanceMonitor.getInstance();
export const queryMonitor = QueryPerformanceMonitor.getInstance();
export const dbMonitor = DatabasePerformanceMonitor.getInstance();

// Auto-initialize web vitals
if (typeof window !== 'undefined') {
  performanceMonitor.initWebVitals();
}

export default {
  performanceMonitor,
  queryMonitor,
  dbMonitor,
  usePerformanceMonitor,
};
