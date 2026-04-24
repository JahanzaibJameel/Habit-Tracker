/**
 * Enterprise-grade Performance Budget System
 * - Real-time performance monitoring
 * - Budget enforcement and alerts
 * - Automatic optimization triggers
 * - Performance regression detection
 */

import { safeLocalStorage } from '../utils/ssr-safe';

export interface PerformanceBudget {
  renderTime: number; // ms
  memoryUsage: number; // MB
  reRenderFrequency: number; // per minute
  bundleSize: number; // KB
  networkRequests: number; // per session
  firstContentfulPaint: number; // ms
  largestContentfulPaint: number; // ms
  cumulativeLayoutShift: number;
  firstInputDelay: number; // ms
}

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  reRenderFrequency: number;
  componentCount: number;
  updateTime: number;
  sessionId: string;
}

export interface PerformanceViolation {
  id: string;
  metric: keyof PerformanceBudget;
  actual: number;
  budget: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  component?: string | undefined;
  context: Record<string, any>;
}

export interface PerformanceConfig {
  budget: PerformanceBudget;
  enableAutoOptimization: boolean;
  enableAlerts: boolean;
  monitoringInterval: number; // ms
  maxViolations: number;
  violationHistorySize: number;
}

export class PerformanceBudgetSystem {
  private static instance: PerformanceBudgetSystem;
  private config: PerformanceConfig;
  private violations: PerformanceViolation[] = [];
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private observers: PerformanceObserver[] = [];
  private sessionId: string;
  private startTime: number;
  private renderCounts: Map<string, number> = new Map();
  private lastRenderTime: Map<string, number> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = performance.now();

    this.config = {
      budget: {
        renderTime: 16, // 60fps
        memoryUsage: 50, // 50MB
        reRenderFrequency: 10, // per minute
        bundleSize: 500, // 500KB
        networkRequests: 100,
        firstContentfulPaint: 1500,
        largestContentfulPaint: 2500,
        cumulativeLayoutShift: 0.1,
        firstInputDelay: 100,
      },
      enableAutoOptimization: true,
      enableAlerts: true,
      monitoringInterval: 1000, // 1 second
      maxViolations: 50,
      violationHistorySize: 100,
      ...config,
    };
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceBudgetSystem {
    if (!PerformanceBudgetSystem.instance) {
      PerformanceBudgetSystem.instance = new PerformanceBudgetSystem(config);
    }
    return PerformanceBudgetSystem.instance;
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupWebVitalsObserver();
    this.setupMemoryObserver();
    this.startMetricsCollection();

    console.log('Performance budget monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    console.log('Performance budget monitoring stopped');
  }

  // Setup Web Vitals observer
  private setupWebVitalsObserver(): void {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.checkBudgetViolation('largestContentfulPaint', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.checkBudgetViolation('firstInputDelay', fid);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.checkBudgetViolation('cumulativeLayoutShift', clsValue);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Web Vitals observers not supported:', error);
    }
  }

  // Setup memory monitoring
  private setupMemoryObserver(): void {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        this.checkBudgetViolation('memoryUsage', usedMB);
      };

      // Check memory every 5 seconds
      setInterval(checkMemory, 5000);
    }
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
  }

  // Collect current performance metrics
  private collectMetrics(): void {
    const now = performance.now();
    const memory = (performance as any).memory;

    const metrics: PerformanceMetrics = {
      renderTime: this.calculateAverageRenderTime(),
      memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
      reRenderCount: this.getTotalRenderCount(),
      reRenderFrequency: this.calculateRenderFrequency(),
      componentCount: this.renderCounts.size,
      updateTime: now,
      sessionId: this.sessionId,
    };

    this.metrics.push(metrics);

    // Keep only recent metrics (last 100)
    if (this.metrics.length > 100) {
      this.metrics.splice(0, this.metrics.length - 100);
    }

    // Check budget violations
    this.checkMetricViolations(metrics);
  }

  // Track component render
  trackComponentRender(componentName: string, renderTime: number): void {
    const currentCount = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, currentCount + 1);
    this.lastRenderTime.set(componentName, performance.now());

    // Check render time budget
    this.checkBudgetViolation('renderTime', renderTime, componentName);
  }

  // Calculate average render time
  private calculateAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;

    const recentMetrics = this.metrics.slice(-10); // Last 10 measurements
    const totalRenderTime = recentMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return totalRenderTime / recentMetrics.length;
  }

  // Get total render count
  private getTotalRenderCount(): number {
    return Array.from(this.renderCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  // Calculate render frequency per minute
  private calculateRenderFrequency(): number {
    const oneMinuteAgo = performance.now() - 60000;
    let recentRenders = 0;

    this.lastRenderTime.forEach((time) => {
      if (time > oneMinuteAgo) {
        recentRenders++;
      }
    });

    return recentRenders;
  }

  // Check for budget violations
  private checkBudgetViolation(
    metric: keyof PerformanceBudget,
    value: number,
    component?: string
  ): void {
    const budget = this.config.budget[metric];

    if (value > budget) {
      const violation: PerformanceViolation = {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric,
        actual: value,
        budget,
        severity: this.calculateSeverity(metric, value, budget),
        timestamp: Date.now(),
        component,
        context: {
          sessionId: this.sessionId,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
        },
      };

      this.addViolation(violation);
    }
  }

  // Check all metric violations
  private checkMetricViolations(metrics: PerformanceMetrics): void {
    this.checkBudgetViolation('memoryUsage', metrics.memoryUsage);
    this.checkBudgetViolation('reRenderFrequency', metrics.reRenderFrequency);
  }

  // Calculate violation severity
  private calculateSeverity(
    metric: keyof PerformanceBudget,
    actual: number,
    budget: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = actual / budget;

    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  // Add violation to history
  private addViolation(violation: PerformanceViolation): void {
    this.violations.push(violation);

    // Trim violation history
    if (this.violations.length > this.config.violationHistorySize) {
      this.violations.splice(0, this.violations.length - this.config.violationHistorySize);
    }

    // Log violation
    this.logViolation(violation);

    // Trigger auto-optimization if enabled
    if (this.config.enableAutoOptimization) {
      this.triggerAutoOptimization(violation);
    }

    // Alert if enabled
    if (this.config.enableAlerts) {
      this.triggerAlert(violation);
    }
  }

  // Log violation
  private logViolation(violation: PerformanceViolation): void {
    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const violations = JSON.parse(storage.getItem('performance-violations') || '[]');
      violations.push(violation);

      // Keep only last 100 violations
      if (violations.length > 100) {
        violations.splice(0, violations.length - 100);
      }

      storage.setItem('performance-violations', JSON.stringify(violations));
    } catch (error) {
      console.error('Failed to log performance violation:', error);
    }

    // Console logging
    const logMethod =
      violation.severity === 'critical'
        ? 'error'
        : violation.severity === 'high'
          ? 'error'
          : violation.severity === 'medium'
            ? 'warn'
            : 'log';

    console[logMethod](
      `Performance Budget Violation: ${violation.metric}`,
      `Actual: ${violation.actual.toFixed(2)}, Budget: ${violation.budget}`,
      violation.component ? `Component: ${violation.component}` : '',
      violation
    );
  }

  // Trigger auto-optimization
  private triggerAutoOptimization(violation: PerformanceViolation): void {
    switch (violation.metric) {
      case 'renderTime':
        // Suggest React.memo, useMemo, useCallback
        console.warn(
          'Auto-optimization suggestion: Consider using React.memo, useMemo, or useCallback'
        );
        break;
      case 'memoryUsage':
        // Suggest cleanup and garbage collection
        console.warn(
          'Auto-optimization suggestion: Consider implementing cleanup and memory management'
        );
        break;
      case 'reRenderFrequency':
        // Suggest state optimization
        console.warn(
          'Auto-optimization suggestion: Consider optimizing state updates and component structure'
        );
        break;
    }
  }

  // Trigger alert
  private triggerAlert(violation: PerformanceViolation): void {
    if (violation.severity === 'critical' || violation.severity === 'high') {
      // Could integrate with notification system
      console.error(
        `Performance Alert: ${violation.metric} exceeded budget by ${((violation.actual / violation.budget - 1) * 100).toFixed(1)}%`
      );
    }
  }

  // Get current performance status
  getPerformanceStatus(): {
    isHealthy: boolean;
    violations: PerformanceViolation[];
    metrics: PerformanceMetrics;
    budgetCompliance: Record<keyof PerformanceBudget, boolean>;
    score: number; // 0-100
  } {
    const recentMetrics = this.metrics[this.metrics.length - 1];
    const recentViolations = this.violations.filter((v) => Date.now() - v.timestamp < 60000); // Last minute

    const budgetCompliance = {} as Record<keyof PerformanceBudget, boolean>;
    let compliantCount = 0;
    const totalMetrics = Object.keys(this.config.budget).length;

    Object.entries(this.config.budget).forEach(([key, budget]) => {
      const actual = this.getCurrentValue(key as keyof PerformanceBudget);
      budgetCompliance[key as keyof PerformanceBudget] = actual <= budget;
      if (actual <= budget) compliantCount++;
    });

    const score = (compliantCount / totalMetrics) * 100;
    const isHealthy = score >= 80 && recentViolations.length < 5;

    return {
      isHealthy,
      violations: recentViolations,
      metrics: recentMetrics || ({} as PerformanceMetrics),
      budgetCompliance,
      score,
    };
  }

  // Get current value for a metric
  private getCurrentValue(metric: keyof PerformanceBudget): number {
    const recentMetrics = this.metrics[this.metrics.length - 1];
    if (!recentMetrics) return 0;

    switch (metric) {
      case 'renderTime':
        return recentMetrics.renderTime;
      case 'memoryUsage':
        return recentMetrics.memoryUsage;
      case 'reRenderFrequency':
        return recentMetrics.reRenderFrequency;
      default:
        return 0;
    }
  }

  // Get violation history
  getViolations(): PerformanceViolation[] {
    return [...this.violations];
  }

  // Get metrics history
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Clear all data
  clearData(): void {
    this.violations = [];
    this.metrics = [];
    this.renderCounts.clear();
    this.lastRenderTime.clear();

    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem('performance-violations');
    }
  }

  // Update budget
  updateBudget(newBudget: Partial<PerformanceBudget>): void {
    this.config.budget = { ...this.config.budget, ...newBudget };
    console.log('Performance budget updated:', newBudget);
  }
}

// Global instance
export const performanceBudgetSystem = PerformanceBudgetSystem.getInstance();

// React hook for performance tracking
export function usePerformanceBudget(componentName: string) {
  const trackRender = (renderTime: number) => {
    performanceBudgetSystem.trackComponentRender(componentName, renderTime);
  };

  return { trackRender };
}
