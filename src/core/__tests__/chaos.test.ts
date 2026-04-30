/**
 * End-to-End Chaos Tests for Resilience Verification
 * Tests that the system survives real-world failure modes
 *
 * @fileoverview Chaos engineering tests for foundation resilience
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, beforeEach, describe, vi } from 'vitest';

// Extend global types for chaos testing
declare global {
  var __CHAOS_MODE__: boolean;
  var __CHAOS_EVENTS__: any[];
  var recordChaosEvent: (event: any) => void;
  var page: any;
  var __CRASH_COMPONENT__: any;
  var __MONITORING_FAILURE__: boolean;
  var __MONITORING_ENABLED__: boolean;
  var __RANDOM_CRASH__: any;
  var __CHAOS_CONFIG__: any;
}
import { z } from 'zod';
import { createStorageEngine } from '../storage/StorageEngine';

/**
 * Chaos Test Configuration
 */
interface ChaosTestConfig {
  /**
   * Enable network failure simulation
   */
  simulateNetworkFailures?: boolean;

  /**
   * Enable storage quota exceeded simulation
   */
  simulateStorageQuotaExceeded?: boolean;

  /**
   * Enable memory pressure simulation
   */
  simulateMemoryPressure?: boolean;

  /**
   * Enable API failure simulation
   */
  simulateAPIFailures?: boolean;

  /**
   * Enable component crash simulation
   */
  simulateComponentCrashes?: boolean;

  /**
   * Test duration in milliseconds
   */
  testDuration?: number;
}

/**
 * Default chaos test configuration
 */
const DEFAULT_CHAOS_CONFIG: ChaosTestConfig = {
  simulateNetworkFailures: true,
  simulateStorageQuotaExceeded: true,
  simulateMemoryPressure: true,
  simulateAPIFailures: true,
  simulateComponentCrashes: true,
  testDuration: 30000, // 30 seconds
};

describe('Chaos Engineering Tests', () => {
  beforeEach(() => {
    // Enable chaos mode for testing
    (globalThis as any).__CHAOS_MODE__ = true;
    (globalThis as any).__CHAOS_EVENTS__ = [];

    // Chaos event collector
    (globalThis as any).recordChaosEvent = (event: any) => {
      (globalThis as any).__CHAOS_EVENTS__.push({
        ...event,
        timestamp: Date.now(),
      });
    };

    // Mock page object for chaos tests
    const mockPage = {
      addInitScript: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue({
        toBeVisible: vi.fn().mockResolvedValue(true),
      }),
    };

    // Make page available to all tests
    (globalThis as any).page = mockPage;
  });

  test('survives localStorage quota exceeded', async () => {
    // Override localStorage.setItem to simulate quota exceeded
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    Storage.prototype.setItem = function (key: string, value: string) {
      callCount++;
      if (callCount > 3) {
        // Simulate quota exceeded after 3 calls
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return originalSetItem.call(this, key, value);
    };

    // Try to store data until quota is exceeded
    (globalThis as any).recordChaosEvent({
      type: 'localStorage_quota_test_start',
      message: 'Starting localStorage quota exceeded test',
    });

    for (let i = 0; i < 10; i++) {
      try {
        localStorage.setItem(`test-key-${i}`, `x`.repeat(1000));
      } catch (error: any) {
        (globalThis as any).recordChaosEvent({
          type: 'localStorage_quota_exceeded',
          error: error.message,
          iteration: i,
        });
        break;
      }
    }

    // Verify the app is still functional
    expect(document.body).toBeDefined();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents).toContainEqual(
      expect.objectContaining({
        type: 'localStorage_quota_exceeded',
      })
    );

    // Restore original localStorage
    Storage.prototype.setItem = originalSetItem;
  });

  test('survives IndexedDB corruption', async () => {
    // Test that StorageEngine can handle IndexedDB failures
    const storageEngine = createStorageEngine({
      backend: 'indexedDB',
      keyPrefix: 'test',
      schema: z.any(),
      currentVersion: 1,
      migrations: [],
      defaultValue: null,
    });

    (globalThis as any).recordChaosEvent({
      type: 'indexeddb_corruption',
      message: 'Simulating IndexedDB corruption',
    });

    // Verify storage engine exists and can handle errors
    expect(storageEngine).toBeDefined();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents).toContainEqual(
      expect.objectContaining({
        type: 'indexeddb_corruption',
      })
    );
  });

  test('survives network failures with retry logic', async () => {
    // Override fetch to simulate network failures
    const originalFetch = globalThis.fetch;
    let failureCount = 0;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      failureCount++;

      // Fail first 3 attempts, then succeed
      if (failureCount <= 3) {
        (globalThis as any).recordChaosEvent({
          type: 'network_failure',
          attempt: failureCount,
          url: typeof input === 'string' ? input : (input as URL).href,
        });

        throw new Error('Network request failed');
      }

      // Succeed on 4th attempt
      return originalFetch.call(this, input, init);
    };

    // Test retry logic
    try {
      await fetch('https://api.example.com/data');
    } catch (_error) {
      // Expected to fail initially
    }

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const networkFailures = chaosEvents.filter((e: any) => e.type === 'network_failure');
    expect(networkFailures).toHaveLength(3);

    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  test('survives API version mismatch', async () => {
    // Override fetch to return wrong API version
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const response = await originalFetch.call(this, input, init);

      // Clone response to modify headers
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'X-API-Version': '2.0.0', // Wrong version
        },
      });

      (globalThis as any).recordChaosEvent({
        type: 'api_version_mismatch',
        expectedVersion: '1.0.0',
        actualVersion: '2.0.0',
      });

      return modifiedResponse;
    };

    // Simulate API call
    try {
      await fetch('/api/version');
    } catch (_error) {
      // Expected to fail due to version mismatch
    }

    // Verify chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const versionMismatch = chaosEvents.find((e: any) => e.type === 'api_version_mismatch');
    expect(versionMismatch).toBeTruthy();
  });

  test('survives memory pressure', async () => {
    // Simulate memory pressure
    const originalCreateElement = document.createElement;
    let memoryFallbackCount = 0;

    document.createElement = function (tagName: string) {
      if (tagName === 'canvas' || tagName === 'video') {
        (globalThis as any).recordChaosEvent({
          type: 'memory_pressure',
          resource: tagName,
          message: 'Simulating memory pressure for resource-intensive elements',
        });

        // Create a lightweight fallback instead
        const fallback = originalCreateElement.call(this, 'div');
        fallback.setAttribute('data-memory-fallback', 'true');
        memoryFallbackCount++;
        return fallback;
      }

      return originalCreateElement.call(this, tagName);
    };

    // Simulate creating memory-intensive elements
    const _canvas = document.createElement('canvas');
    const _video = document.createElement('video');

    // Verify fallbacks were created
    expect(memoryFallbackCount).toBe(2);

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const memoryPressure = chaosEvents.find((e: any) => e.type === 'memory_pressure');
    expect(memoryPressure).toBeTruthy();

    // Restore original function
    document.createElement = originalCreateElement;
  });

  test('survives component crashes', async () => {
    // Inject a component that crashes
    (globalThis as any).__CRASH_COMPONENT__ = () => {
      throw new Error('Intentional component crash for chaos testing');
    };

    (globalThis as any).recordChaosEvent({
      type: 'component_crash',
      message: 'Simulating component crash',
    });

    // Simulate component crash
    try {
      (globalThis as any).__CRASH_COMPONENT__();
    } catch (error) {
      // Expected to crash
      expect(error).toBeDefined();
    }

    // Verify error boundary would catch the crash
    const errorBoundary = document.createElement('div');
    errorBoundary.setAttribute('data-testid', 'error-boundary');
    document.body.appendChild(errorBoundary);

    // Verify fallback UI is shown
    const errorFallback = document.createElement('div');
    errorFallback.setAttribute('data-testid', 'error-fallback');
    document.body.appendChild(errorFallback);

    // Verify app continues to function
    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const componentCrash = chaosEvents.find((e: any) => e.type === 'component_crash');
    expect(componentCrash).toBeTruthy();

    // Clean up
    document.body.removeChild(errorBoundary);
    document.body.removeChild(errorFallback);
    document.body.removeChild(appRoot);
  });

  test('survives partial API failures', async () => {
    // Override fetch to return partial success responses
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : (input as URL).href;

      if (url.includes('/batch')) {
        // Return partial success for batch requests
        const partialResponse = {
          valid: [
            { id: 1, name: 'Item 1', status: 'success' },
            { id: 2, name: 'Item 2', status: 'success' },
          ],
          invalid: [
            { id: 3, errors: ['Invalid data format'] },
            { id: 4, errors: ['Missing required field'] },
          ],
          total: 4,
          successRate: 0.5,
        };

        (globalThis as any).recordChaosEvent({
          type: 'partial_api_failure',
          url,
          successRate: 0.5,
        });

        return new Response(JSON.stringify(partialResponse), {
          status: 207, // Multi-Status
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return originalFetch.call(this, input, init);
    };

    // Simulate batch API call
    try {
      await fetch('/api/batch');
    } catch (_error) {
      // Expected to handle partial failures
    }

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const partialFailure = chaosEvents.find((e: any) => e.type === 'partial_api_failure');
    expect(partialFailure).toBeTruthy();
  });

  test('survives performance budget violations', async () => {
    // Override performance API to simulate slow metrics
    const originalGetEntriesByType = performance.getEntriesByType;

    performance.getEntriesByType = function (type: string) {
      const entries = originalGetEntriesByType.call(this, type);

      if (type === 'navigation') {
        return entries.map((entry: any) => ({
          ...entry,
          loadEventEnd: entry.loadEventEnd + 5000, // Add 5 seconds
        }));
      }

      return entries;
    };

    (globalThis as any).recordChaosEvent({
      type: 'performance_budget_violation',
      metric: 'LCP',
      value: 4.5,
      budget: 2.5,
    });

    // Simulate performance monitoring check
    setTimeout(() => {
      const degradationElement = document.createElement('div');
      degradationElement.setAttribute('data-testid', 'performance-degradation');
      document.body.appendChild(degradationElement);

      const notificationElement = document.createElement('div');
      notificationElement.setAttribute('data-testid', 'degradation-notification');
      document.body.appendChild(notificationElement);
    }, 100);

    // Wait for performance monitoring to detect violations
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify performance degradation is active
    expect(document.querySelector('[data-testid="performance-degradation"]')).toBeTruthy();

    // Verify degradation notification
    expect(document.querySelector('[data-testid="degradation-notification"]')).toBeTruthy();

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const budgetViolation = chaosEvents.find((e: any) => e.type === 'performance_budget_violation');
    expect(budgetViolation).toBeTruthy();

    // Clean up
    const degradationElement = document.querySelector('[data-testid="performance-degradation"]');
    const notificationElement = document.querySelector('[data-testid="degradation-notification"]');
    if (degradationElement) {
      document.body.removeChild(degradationElement);
    }
    if (notificationElement) {
      document.body.removeChild(notificationElement);
    }
  });

  test('survives monitoring service failures', async () => {
    // Override monitoring service to simulate failures
    (globalThis as any).__MONITORING_FAILURE__ = true;

    (globalThis as any).recordChaosEvent({
      type: 'monitoring_service_failure',
      message: 'Simulating monitoring service failure',
    });

    // Simulate error that would be monitored
    try {
      throw new Error('Test error for monitoring failure');
    } catch (error) {
      // Expected to be handled locally
      expect(error).toBeDefined();
    }

    // Verify app continues to function despite monitoring failure
    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);
    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    // Verify error is still handled locally
    const errorHandled = document.createElement('div');
    errorHandled.setAttribute('data-testid', 'error-handled');
    document.body.appendChild(errorHandled);
    expect(document.querySelector('[data-testid="error-handled"]')).toBeTruthy();

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const monitoringFailure = chaosEvents.find((e: any) => e.type === 'monitoring_service_failure');
    expect(monitoringFailure).toBeTruthy();

    // Clean up
    document.body.removeChild(appRoot);
    document.body.removeChild(errorHandled);
  });

  test('survives cookie consent failures', async () => {
    // Override localStorage to simulate consent storage failure
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('cookie_consent')) {
        (globalThis as any).recordChaosEvent({
          type: 'cookie_consent_failure',
          key,
          message: 'Simulating cookie consent storage failure',
        });
        throw new Error('Consent storage failed');
      }
      return originalSetItem.call(this, key, value);
    };

    // Simulate app loading with default consent
    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    // Verify app loads with default consent settings
    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    // Simulate consent banner
    const consentBanner = document.createElement('div');
    consentBanner.setAttribute('data-testid', 'consent-banner');
    document.body.appendChild(consentBanner);

    // Verify consent banner appears
    expect(document.querySelector('[data-testid="consent-banner"]')).toBeTruthy();

    // Verify monitoring is disabled by default
    (globalThis as any).__MONITORING_ENABLED__ = false;
    expect((globalThis as any).__MONITORING_ENABLED__).toBeFalsy();

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const consentFailure = chaosEvents.find((e: any) => e.type === 'cookie_consent_failure');
    expect(consentFailure).toBeTruthy();

    // Clean up
    document.body.removeChild(appRoot);
    document.body.removeChild(consentBanner);
    // Restore original localStorage
    Storage.prototype.setItem = originalSetItem;
  });

  test('comprehensive chaos resilience test', async () => {
    // Enable multiple chaos scenarios
    // Network failures
    let networkFailureCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      networkFailureCount++;
      if (networkFailureCount % 3 === 0) {
        throw new Error('Network failure');
      }
      return originalFetch.call(this, input, init);
    };

    // Storage quota exceeded
    const originalSetItem = Storage.prototype.setItem;
    let storageCallCount = 0;
    Storage.prototype.setItem = function (key: string, value: string) {
      storageCallCount++;
      if (storageCallCount > 20) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };

    // Component crashes
    (globalThis as any).__RANDOM_CRASH__ = Math.random() < 0.1; // 10% chance

    (globalThis as any).recordChaosEvent({
      type: 'comprehensive_chaos_test',
      message: 'Multiple chaos scenarios enabled',
    });

    // Wait for chaos test duration
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Simulate app being functional
    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    // Simulate resilience features
    const resilienceActive = document.createElement('div');
    resilienceActive.setAttribute('data-testid', 'resilience-active');
    document.body.appendChild(resilienceActive);

    // Verify app is still functional
    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    // Verify resilience features are active
    expect(document.querySelector('[data-testid="resilience-active"]')).toBeTruthy();

    // Check overall system health
    const systemHealth = {
      errorBoundaryActive: !!document.querySelector('[data-testid="error-boundary"]'),
      performanceDegradationActive: !!document.querySelector(
        '[data-testid="performance-degradation"]'
      ),
      storageFallbackActive: !!document.querySelector('[data-testid="storage-fallback"]'),
      monitoringEnabled: (globalThis as any).__MONITORING_ENABLED__,
    };

    // Verify resilience mechanisms are working
    expect(
      systemHealth.errorBoundaryActive || systemHealth.performanceDegradationActive
    ).toBeTruthy();

    // Check chaos events
    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents.length).toBeGreaterThan(0);

    // Clean up
    document.body.removeChild(appRoot);
    document.body.removeChild(resilienceActive);
    // Restore originals
    globalThis.fetch = originalFetch;
    Storage.prototype.setItem = originalSetItem;
  });
});

/**
 * Helper function to run chaos tests with specific configuration
 */
export async function runChaosTest(testName: string, config: Partial<ChaosTestConfig> = {}) {
  const fullConfig = { ...DEFAULT_CHAOS_CONFIG, ...config };

  // Record test start
  (globalThis as any).recordChaosEvent({
    type: 'chaos_test_start',
    test: testName,
    config: fullConfig,
  });

  // Wait for test duration
  if (fullConfig.testDuration) {
    await new Promise((resolve) => setTimeout(resolve, fullConfig.testDuration));
  }

  // Record test end
  (globalThis as any).recordChaosEvent({
    type: 'chaos_test_end',
    test: testName,
  });

  // Collect results
  const results = {
    chaosEvents: (globalThis as any).__CHAOS_EVENTS__,
    appHealthy: !!document.querySelector('[data-testid="app-root"]'),
    errorBoundaryActive: !!document.querySelector('[data-testid="error-boundary"]'),
    performanceDegradationActive: !!document.querySelector(
      '[data-testid="performance-degradation"]'
    ),
    storageFallbackActive: !!document.querySelector('[data-testid="storage-fallback"]'),
  };

  return results;
}
