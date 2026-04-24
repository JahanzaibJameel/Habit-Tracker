/**
 * Enterprise-grade Production Monitoring Layer
 * - Structured logging system
 * - Event tracing and telemetry
 * - Performance metrics collection
 * - Error tracking and reporting
 * - User interaction monitoring (safe mode)
 */

import { safeLocalStorage, safeWindow } from '../utils/ssr-safe';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  category: string;
  context: Record<string, any>;
  sessionId: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

export interface TraceEvent {
  id: string;
  type: 'user_action' | 'navigation' | 'performance' | 'error' | 'state_change';
  name: string;
  timestamp: number;
  duration?: number;
  data: Record<string, any>;
  sessionId: string;
  parentEventId?: string;
}

export interface SystemMetrics {
  timestamp: number;
  sessionId: string;
  memoryUsage: number;
  renderTime: number;
  networkRequests: number;
  errorCount: number;
  userInteractions: number;
  performanceScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface MonitoringConfig {
  enableLogging: boolean;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableErrorTracking: boolean;
  enableUserMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  maxLogEntries: number;
  maxTraceEvents: number;
  maxMetrics: number;
  retentionPeriod: number; // ms
  enableCompression: boolean;
}

export class ProductionMonitoringSystem {
  private static instance: ProductionMonitoringSystem;
  private config: MonitoringConfig;
  private logs: LogEntry[] = [];
  private traces: TraceEvent[] = [];
  private metrics: SystemMetrics[] = [];
  private sessionId: string;
  private startTime: number;
  private activeTraces: Map<string, number> = new Map();
  private isInitialized = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = performance.now();

    this.config = {
      enableLogging: true,
      enableTracing: true,
      enableMetrics: true,
      enableErrorTracking: true,
      enableUserMonitoring: true,
      logLevel: 'info',
      maxLogEntries: 1000,
      maxTraceEvents: 500,
      maxMetrics: 200,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableCompression: false,
      ...config,
    };
  }

  static getInstance(config?: Partial<MonitoringConfig>): ProductionMonitoringSystem {
    if (!ProductionMonitoringSystem.instance) {
      ProductionMonitoringSystem.instance = new ProductionMonitoringSystem(config);
    }
    return ProductionMonitoringSystem.instance;
  }

  // Initialize monitoring system
  initialize(): void {
    if (this.isInitialized) return;

    this.setupGlobalErrorHandlers();
    this.setupPerformanceObserver();
    this.startMetricsCollection();
    this.loadPersistedData();

    this.isInitialized = true;
    this.log('info', 'Monitoring system initialized', 'system', { sessionId: this.sessionId });
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    const window = safeWindow();
    if (!window) return;

    window.addEventListener('error', (event) => {
      this.trackError(
        {
          message: event.message,
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        'javascript_error'
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        {
          message: 'Unhandled promise rejection',
          stack: event.reason?.stack,
          reason: event.reason,
        },
        'promise_rejection'
      );
    });
  }

  // Setup performance observer
  private setupPerformanceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.traceEvent('navigation', 'page_load', {
              loadTime: entry.duration,
              domContentLoaded:
                navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              transferSize: navEntry.transferSize,
            });
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.traceEvent('performance', 'resource_load', {
              name: entry.name,
              duration: entry.duration,
              size: resourceEntry.transferSize,
            });
          }
        });
      });
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 5000); // Every 5 seconds
  }

  // Collect system metrics
  private collectMetrics(): void {
    const memory = (performance as any).memory;
    const errorCount = this.logs.filter(
      (log) => log.level === 'error' || log.level === 'critical'
    ).length;
    const userInteractions = this.traces.filter((trace) => trace.type === 'user_action').length;

    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
      renderTime: this.calculateAverageRenderTime(),
      networkRequests: this.traces.filter((t) => t.type === 'performance').length,
      errorCount,
      userInteractions,
      performanceScore: this.calculatePerformanceScore(),
      healthStatus: this.determineHealthStatus(errorCount, userInteractions),
    };

    this.addMetrics(metrics);
  }

  // Calculate average render time
  private calculateAverageRenderTime(): number {
    const renderTraces = this.traces.filter((t) => t.type === 'performance' && t.name === 'render');
    if (renderTraces.length === 0) return 0;

    const totalTime = renderTraces.reduce((sum, trace) => sum + (trace.duration || 0), 0);
    return totalTime / renderTraces.length;
  }

  // Calculate performance score
  private calculatePerformanceScore(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 100;

    let score = 100;

    // Memory usage penalty
    const avgMemory =
      recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    if (avgMemory > 100) score -= 30;
    else if (avgMemory > 50) score -= 15;

    // Error count penalty
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    score -= Math.min(totalErrors * 5, 40);

    // Render time penalty
    const avgRenderTime = this.calculateAverageRenderTime();
    if (avgRenderTime > 100) score -= 20;
    else if (avgRenderTime > 50) score -= 10;

    return Math.max(0, score);
  }

  // Determine health status
  private determineHealthStatus(
    errorCount: number,
    userInteractions: number
  ): 'healthy' | 'warning' | 'critical' {
    if (errorCount > 10 || this.calculatePerformanceScore() < 50) return 'critical';
    if (errorCount > 5 || this.calculatePerformanceScore() < 70) return 'warning';
    return 'healthy';
  }

  // Add metrics
  private addMetrics(metrics: SystemMetrics): void {
    this.metrics.push(metrics);

    // Trim metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.config.maxMetrics);
    }

    // Persist metrics
    this.persistData();
  }

  // Log entry
  log(
    level: LogEntry['level'],
    message: string,
    category: string,
    context: Record<string, any> = {}
  ): void {
    if (!this.config.enableLogging) return;

    if (!this.shouldLogLevel(level)) return;

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      category,
      context,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    };

    this.addLog(entry);
  }

  // Check if should log level
  private shouldLogLevel(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const entryLevel = levels.indexOf(level);
    return entryLevel >= configLevel;
  }

  // Add log entry
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Trim logs
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.splice(0, this.logs.length - this.config.maxLogEntries);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod =
        entry.level === 'critical'
          ? 'error'
          : entry.level === 'error'
            ? 'error'
            : entry.level === 'warn'
              ? 'warn'
              : 'log';
      console[consoleMethod](`[${entry.category}] ${entry.message}`, entry.context);
    }

    // Persist logs
    this.persistData();
  }

  // Trace event
  traceEvent(type: TraceEvent['type'], name: string, data: Record<string, any> = {}): void {
    if (!this.config.enableTracing) return;

    const event: TraceEvent = {
      id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      timestamp: Date.now(),
      data,
      sessionId: this.sessionId,
    };

    this.addTrace(event);
  }

  // Start trace
  startTrace(name: string): string {
    if (!this.config.enableTracing) return '';

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeTraces.set(traceId, performance.now());

    return traceId;
  }

  // End trace
  endTrace(traceId: string, data: Record<string, any> = {}): void {
    if (!this.config.enableTracing) return;

    const startTime = this.activeTraces.get(traceId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.activeTraces.delete(traceId);

    const event: TraceEvent = {
      id: traceId,
      type: 'performance',
      name: 'custom_trace',
      timestamp: Date.now(),
      duration,
      data: { ...data, traceName: name },
      sessionId: this.sessionId,
    };

    this.addTrace(event);
  }

  // Add trace event
  private addTrace(event: TraceEvent): void {
    this.traces.push(event);

    // Trim traces
    if (this.traces.length > this.config.maxTraceEvents) {
      this.traces.splice(0, this.traces.length - this.config.maxTraceEvents);
    }

    // Persist traces
    this.persistData();
  }

  // Track error
  trackError(errorData: any, errorType: string): void {
    if (!this.config.enableErrorTracking) return;

    this.log('error', `Error tracked: ${errorType}`, 'error_tracking', {
      errorData,
      errorType,
      timestamp: Date.now(),
    });

    this.traceEvent('error', errorType, errorData);
  }

  // Track user interaction
  trackUserInteraction(action: string, element?: string, data: Record<string, any> = {}): void {
    if (!this.config.enableUserMonitoring) return;

    this.traceEvent('user_action', action, {
      element,
      ...data,
    });

    this.log('debug', `User action: ${action}`, 'user_interaction', { element, data });
  }

  // Track state change
  trackStateChange(state: string, oldValue: any, newValue: any): void {
    this.traceEvent('state_change', state, {
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
    });

    this.log('debug', `State change: ${state}`, 'state_management', {
      oldValue,
      newValue,
    });
  }

  // Get monitoring dashboard data
  getDashboardData(): {
    logs: LogEntry[];
    traces: TraceEvent[];
    metrics: SystemMetrics[];
    summary: {
      totalLogs: number;
      errorCount: number;
      performanceScore: number;
      healthStatus: string;
      uptime: number;
    };
  } {
    const errorCount = this.logs.filter(
      (log) => log.level === 'error' || log.level === 'critical'
    ).length;
    const latestMetrics = this.metrics[this.metrics.length - 1];

    return {
      logs: this.logs.slice(-100), // Last 100 logs
      traces: this.traces.slice(-50), // Last 50 traces
      metrics: this.metrics.slice(-20), // Last 20 metrics
      summary: {
        totalLogs: this.logs.length,
        errorCount,
        performanceScore: latestMetrics?.performanceScore || 100,
        healthStatus: latestMetrics?.healthStatus || 'healthy',
        uptime: Date.now() - this.startTime,
      },
    };
  }

  // Export monitoring data
  exportData(): {
    logs: LogEntry[];
    traces: TraceEvent[];
    metrics: SystemMetrics[];
    exportedAt: number;
    sessionId: string;
  } {
    return {
      logs: this.logs,
      traces: this.traces,
      metrics: this.metrics,
      exportedAt: Date.now(),
      sessionId: this.sessionId,
    };
  }

  // Persist data to localStorage
  private persistData(): void {
    if (typeof window === 'undefined') return;

    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const data = {
        logs: this.logs.slice(-100), // Only last 100 logs
        traces: this.traces.slice(-50), // Only last 50 traces
        metrics: this.metrics.slice(-20), // Only last 20 metrics
        sessionId: this.sessionId,
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(data);
      storage.setItem('production-monitoring-data', serialized);
    } catch (error) {
      console.error('Failed to persist monitoring data:', error);
    }
  }

  // Load persisted data
  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;

    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const data = storage.getItem('production-monitoring-data');
      if (data) {
        const parsed = JSON.parse(data);

        // Only load data if it's from the same session or recent
        if (
          parsed.sessionId === this.sessionId ||
          Date.now() - parsed.timestamp < this.config.retentionPeriod
        ) {
          this.logs = parsed.logs || [];
          this.traces = parsed.traces || [];
          this.metrics = parsed.metrics || [];
        }
      }
    } catch (error) {
      console.error('Failed to load persisted monitoring data:', error);
    }
  }

  // Clear all monitoring data
  clearData(): void {
    this.logs = [];
    this.traces = [];
    this.metrics = [];
    this.activeTraces.clear();

    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem('production-monitoring-data');
    }
  }

  // Get system health report
  getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    score: number;
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const recentErrors = this.logs.filter(
      (log) =>
        (log.level === 'error' || log.level === 'critical') && Date.now() - log.timestamp < 300000 // Last 5 minutes
    );

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (recentErrors.length > 5) {
      issues.push('High error rate detected');
      recommendations.push('Review recent error logs and fix critical issues');
      score -= 20;
    }

    if (latestMetrics?.memoryUsage && latestMetrics.memoryUsage > 100) {
      issues.push('High memory usage');
      recommendations.push('Optimize memory usage and implement cleanup');
      score -= 15;
    }

    if (latestMetrics?.performanceScore && latestMetrics.performanceScore < 70) {
      issues.push('Poor performance score');
      recommendations.push('Optimize rendering and reduce bundle size');
      score -= 25;
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 80) status = 'warning';

    return {
      status,
      issues,
      recommendations,
      score: Math.max(0, score),
    };
  }
}

// Global instance
export const productionMonitoring = ProductionMonitoringSystem.getInstance();

// Convenience functions
export const log = (
  level: LogEntry['level'],
  message: string,
  category: string,
  context?: Record<string, any>
) => {
  productionMonitoring.log(level, message, category, context);
};

export const traceEvent = (type: TraceEvent['type'], name: string, data?: Record<string, any>) => {
  productionMonitoring.traceEvent(type, name, data);
};

export const trackUserInteraction = (
  action: string,
  element?: string,
  data?: Record<string, any>
) => {
  productionMonitoring.trackUserInteraction(action, element, data);
};

export const trackStateChange = (state: string, oldValue: any, newValue: any) => {
  productionMonitoring.trackStateChange(state, oldValue, newValue);
};

export const startTrace = (name: string) => productionMonitoring.startTrace(name);
export const endTrace = (traceId: string, data?: Record<string, any>) =>
  productionMonitoring.endTrace(traceId, data);
