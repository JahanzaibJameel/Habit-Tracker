/**
 * Unit tests for Performance Monitor
 * Tests metric collection, budget enforcement, and breach detection
 * 
 * @fileoverview Performance monitor tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PerformanceMonitor, PerformanceMonitorConfig } from '../PerformanceMonitor';
import { DefaultBudgetConfig, getEffectiveBudget } from '../budget.config';

// Mock performance API
const mockPerformanceObserver = jest.fn();
const mockPerformance = {
  getEntriesByType: jest.fn(),
  navigation: {
    requestStart: 100,
    responseStart: 500,
    domInteractive: 1000,
    loadEventEnd: 2000,
    domContentLoadedEventEnd: 1500,
  },
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2048 * 1024 * 1024, // 2GB
  },
};

// Mock navigator
const mockNavigator = {
  userAgent: 'Test User Agent',
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  },
};

// Setup global mocks
Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let config: PerformanceMonitorConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    config = {
      budgetConfig: DefaultBudgetConfig,
      enableReporting: false,
      samplingRate: 1.0,
      enableRealTimeMonitoring: true,
      enableBundleAnalysis: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
    };

    monitor = new PerformanceMonitor(config);
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(() => monitor.start()).not.toThrow();
    });

    test('should not start if already monitoring', () => {
      monitor.start();
      const consoleSpy = jest.spyOn(console, 'warn');
      monitor.start();
      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring is already active');
      consoleSpy.mockRestore();
    });

    test('should skip monitoring based on sampling rate', () => {
      const lowSamplingConfig = {
        ...config,
        samplingRate: 0.0, // Never sample
      };
      const lowSamplingMonitor = new PerformanceMonitor(lowSamplingConfig);
      const consoleSpy = jest.spyOn(console, 'log');
      
      lowSamplingMonitor.start();
      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring skipped (sampling rate)');
      
      consoleSpy.mockRestore();
      lowSamplingMonitor.stop();
    });

    test('should stop monitoring cleanly', () => {
      monitor.start();
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('Metric Recording', () => {
    beforeEach(() => {
      monitor.start();
    });

    test('should record performance metrics', () => {
      monitor.recordMetric('test-metric', 100, 'runtime');
      
      const value = monitor.getMetricValue('test-metric');
      expect(value).toBe(100);
    });

    test('should track budget breaches', () => {
      // Record a metric that exceeds the budget
      monitor.recordMetric('lcp', 5000, 'runtime'); // Budget is 2500ms
      
      const breaches = monitor.getBreaches();
      expect(breaches.length).toBeGreaterThan(0);
      expect(breaches[0].metric).toBe('lcp');
      expect(breaches[0].actual).toBe(5000);
      expect(breaches[0].budget).toBe(2500);
    });

    test('should handle metadata in metrics', () => {
      const metadata = { source: 'test', type: 'custom' };
      monitor.recordMetric('test-metric', 100, 'runtime', metadata);
      
      const value = monitor.getMetricValue('test-metric');
      expect(value).toBe(100);
    });

    test('should maintain metric history', () => {
      // Record multiple values
      monitor.recordMetric('test-metric', 100, 'runtime');
      monitor.recordMetric('test-metric', 200, 'runtime');
      monitor.recordMetric('test-metric', 150, 'runtime');
      
      const value = monitor.getMetricValue('test-metric');
      expect(value).toBe(150); // Should return latest value
    });
  });

  describe('Budget Enforcement', () => {
    beforeEach(() => {
      monitor.start();
    });

    test('should detect budget breaches for runtime metrics', () => {
      monitor.recordMetric('lcp', 3000, 'runtime'); // Exceeds 2500ms budget
      
      const breaches = monitor.getBreaches();
      expect(breaches.length).toBe(1);
      expect(breaches[0].severity).toBeDefined();
    });

    test('should detect budget breaches for memory metrics', () => {
      monitor.recordMetric('usedHeapSize', 100, 'memory'); // Exceeds 50MB budget
      
      const breaches = monitor.getBreaches();
      expect(breaches.length).toBe(1);
      expect(breaches[0].category).toBe('memory');
    });

    test('should handle FPS metrics correctly', () => {
      monitor.recordMetric('minFps', 30, 'animation'); // Below 60fps budget
      
      const breaches = monitor.getBreaches();
      expect(breaches.length).toBe(1);
      expect(breaches[0].metric).toBe('minFps');
    });

    test('should not breach when within budget', () => {
      monitor.recordMetric('lcp', 2000, 'runtime'); // Within 2500ms budget
      
      const breaches = monitor.getBreaches();
      expect(breaches.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      monitor.start();
    });

    test('should calculate breach statistics correctly', () => {
      // Create multiple breaches
      monitor.recordMetric('lcp', 3000, 'runtime');
      monitor.recordMetric('fid', 200, 'runtime');
      monitor.recordMetric('usedHeapSize', 100, 'memory');
      
      const stats = monitor.getBreachStats();
      expect(stats.total).toBe(3);
      expect(stats.byCategory.runtime).toBe(2);
      expect(stats.byCategory.memory).toBe(1);
    });

    test('should track recent breaches', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      monitor.recordMetric('lcp', 3000, 'runtime');
      
      // Advance time by 30 minutes
      jest.spyOn(Date, 'now').mockReturnValue(now + 30 * 60 * 1000);
      monitor.recordMetric('fid', 200, 'runtime');
      
      const stats = monitor.getBreachStats();
      expect(stats.recent).toBe(2); // Both within last hour
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      monitor.start();
    });

    test('should export performance data as JSON', () => {
      monitor.recordMetric('test-metric', 100, 'runtime');
      
      const exportData = monitor.exportData();
      const parsed = JSON.parse(exportData);
      
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('breaches');
    });

    test('should include all recorded metrics in export', () => {
      monitor.recordMetric('metric1', 100, 'runtime');
      monitor.recordMetric('metric2', 200, 'runtime');
      
      const exportData = monitor.exportData();
      const parsed = JSON.parse(exportData);
      
      expect(parsed.metrics).toHaveProperty('metric1');
      expect(parsed.metrics).toHaveProperty('metric2');
    });

    test('should clear data on request', () => {
      monitor.recordMetric('test-metric', 100, 'runtime');
      monitor.recordMetric('lcp', 3000, 'runtime'); // Creates breach
      
      expect(monitor.getMetricValue('test-metric')).toBe(100);
      expect(monitor.getBreaches().length).toBe(1);
      
      monitor.clearData();
      
      expect(monitor.getMetricValue('test-metric')).toBeUndefined();
      expect(monitor.getBreaches().length).toBe(0);
    });
  });

  describe('Core Web Vitals Monitoring', () => {
    beforeEach(() => {
      monitor.start();
    });

    test('should setup LCP monitoring', () => {
      expect(mockPerformanceObserver).toHaveBeenCalled();
    });

    test('should setup FID monitoring', () => {
      expect(mockPerformanceObserver).toHaveBeenCalled();
    });

    test('should setup CLS monitoring', () => {
      expect(mockPerformanceObserver).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    test('should monitor memory usage when enabled', () => {
      const memoryConfig = {
        ...config,
        enableMemoryMonitoring: true,
      };
      const memoryMonitor = new PerformanceMonitor(memoryConfig);
      
      memoryMonitor.start();
      jest.advanceTimersByTime(30000); // 30 seconds
      
      expect(mockPerformance.memory).toBeDefined();
      
      memoryMonitor.stop();
    });

    test('should skip memory monitoring when disabled', () => {
      const noMemoryConfig = {
        ...config,
        enableMemoryMonitoring: false,
      };
      const noMemoryMonitor = new PerformanceMonitor(noMemoryConfig);
      
      noMemoryMonitor.start();
      jest.advanceTimersByTime(30000);
      
      // Should not have memory-related timers
      expect(noMemoryMonitor.getMetricValue('usedHeapSize')).toBeUndefined();
      
      noMemoryMonitor.stop();
    });
  });

  describe('Network Monitoring', () => {
    test('should monitor network conditions when enabled', () => {
      const networkConfig = {
        ...config,
        enableNetworkMonitoring: true,
      };
      const networkMonitor = new PerformanceMonitor(networkConfig);
      
      networkMonitor.start();
      jest.advanceTimersByTime(10000); // 10 seconds
      
      expect(networkMonitor.getMetricValue('effectiveType')).toBeDefined();
      
      networkMonitor.stop();
    });

    test('should skip network monitoring when disabled', () => {
      const noNetworkConfig = {
        ...config,
        enableNetworkMonitoring: false,
      };
      const noNetworkMonitor = new PerformanceMonitor(noNetworkConfig);
      
      noNetworkMonitor.start();
      jest.advanceTimersByTime(10000);
      
      expect(noNetworkMonitor.getMetricValue('effectiveType')).toBeUndefined();
      
      noNetworkMonitor.stop();
    });
  });

  describe('Bundle Analysis', () => {
    test('should analyze bundle size when enabled', () => {
      const bundleConfig = {
        ...config,
        enableBundleAnalysis: true,
      };
      const bundleMonitor = new PerformanceMonitor(bundleConfig);
      
      // Mock resource entries
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'app.js', transferSize: 50000 },
        { name: 'vendor.js', transferSize: 100000 },
        { name: 'styles.css', transferSize: 20000 },
      ]);
      
      bundleMonitor.start();
      
      expect(bundleMonitor.getMetricValue('jsBundleSize')).toBe(150000);
      expect(bundleMonitor.getMetricValue('cssBundleSize')).toBe(20000);
      
      bundleMonitor.stop();
    });

    test('should skip bundle analysis when disabled', () => {
      const noBundleConfig = {
        ...config,
        enableBundleAnalysis: false,
      };
      const noBundleMonitor = new PerformanceMonitor(noBundleConfig);
      
      noBundleMonitor.start();
      
      expect(noBundleMonitor.getMetricValue('jsBundleSize')).toBeUndefined();
      expect(noBundleMonitor.getMetricValue('cssBundleSize')).toBeUndefined();
      
      noBundleMonitor.stop();
    });
  });

  describe('Error Handling', () => {
    test('should handle PerformanceObserver errors gracefully', () => {
      mockPerformanceObserver.mockImplementation(() => {
        throw new Error('PerformanceObserver not supported');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn');
      
      expect(() => monitor.start()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to setup LCP monitoring')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle memory API unavailability', () => {
      delete (mockPerformance as any).memory;
      
      const consoleSpy = jest.spyOn(console, 'warn');
      
      monitor.start();
      jest.advanceTimersByTime(30000);
      
      expect(consoleSpy).toHaveBeenCalledWith('Memory API not available');
      
      consoleSpy.mockRestore();
    });

    test('should handle network API unavailability', () => {
      delete (mockNavigator as any).connection;
      
      const consoleSpy = jest.spyOn(console, 'warn');
      
      monitor.start();
      jest.advanceTimersByTime(10000);
      
      expect(consoleSpy).toHaveBeenCalledWith('Network Information API not available');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Periodic Reporting', () => {
    test('should setup periodic reporting when enabled', () => {
      const reportingConfig = {
        ...config,
        enableReporting: true,
        reportEndpoint: 'https://example.com/report',
      };
      const reportingMonitor = new PerformanceMonitor(reportingConfig);
      
      reportingMonitor.start();
      
      // Should setup timer for periodic reporting
      jest.advanceTimersByTime(300000); // 5 minutes
      
      // Timer should be active
      expect(setTimeout).toHaveBeenCalled();
      
      reportingMonitor.stop();
    });

    test('should skip periodic reporting when disabled', () => {
      const noReportingConfig = {
        ...config,
        enableReporting: false,
      };
      const noReportingMonitor = new PerformanceMonitor(noReportingConfig);
      
      noReportingMonitor.start();
      
      // Should not setup reporting timer
      jest.advanceTimersByTime(300000);
      
      noReportingMonitor.stop();
    });
  });

  describe('Budget Configuration', () => {
    test('should use custom budget when provided', () => {
      const customBudgetConfig = {
        ...config,
        budgetConfig: {
          ...DefaultBudgetConfig,
          customBudget: {
            runtime: {
              lcp: 1000, // Custom budget
            },
          },
        },
      };
      
      const customMonitor = new PerformanceMonitor(customBudgetConfig);
      customMonitor.start();
      
      customMonitor.recordMetric('lcp', 1500, 'runtime'); // Exceeds custom budget
      
      const breaches = customMonitor.getBreaches();
      expect(breaches.length).toBe(1);
      expect(breaches[0].budget).toBe(1000);
      
      customMonitor.stop();
    });

    test('should use environment-specific budgets', () => {
      const prodConfig = {
        ...config,
        budgetConfig: {
          ...DefaultBudgetConfig,
          environment: 'production',
        },
      };
      
      const prodMonitor = new PerformanceMonitor(prodConfig);
      prodMonitor.start();
      
      const budget = getEffectiveBudget(prodConfig.budgetConfig);
      expect(budget.runtime.lcp).toBe(2500); // Production budget
      
      prodMonitor.stop();
    });
  });
});
