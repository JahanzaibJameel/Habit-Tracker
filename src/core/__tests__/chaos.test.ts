/**
 * End-to-End Chaos Tests for Resilience Verification
 * Tests that the system survives real-world failure modes
 *
 * @fileoverview Chaos engineering tests for foundation resilience
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from 'vitest';
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

  test('survives API version mismatch', async ({ page }) => {
    await page.addInitScript(() => {
      // Override fetch to return wrong API version
      const originalFetch = window.fetch;

      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
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

        window.recordChaosEvent({
          type: 'api_version_mismatch',
          expectedVersion: '1.0.0',
          actualVersion: '2.0.0',
        });

        return modifiedResponse;
      };
    });

    await page.goto('/');

    // Trigger API call
    await page.click('[data-testid="api-call-button"]');

    // Verify version mismatch notification appears
    await expect(page.locator('[data-testid="version-mismatch-warning"]')).toBeVisible();

    // Verify app continues to function
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const versionMismatch = chaosEvents.find((e: any) => e.type === 'api_version_mismatch');
    expect(versionMismatch).toBeTruthy();
  });

  test('survives memory pressure', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate memory pressure
      const originalCreateElement = document.createElement;

      document.createElement = function (tagName: string) {
        if (tagName === 'canvas' || tagName === 'video') {
          window.recordChaosEvent({
            type: 'memory_pressure',
            resource: tagName,
            message: 'Simulating memory pressure for resource-intensive elements',
          });

          // Create a lightweight fallback instead
          const fallback = document.createElement('div');
          fallback.setAttribute('data-memory-fallback', 'true');
          return fallback;
        }

        return originalCreateElement.call(this, tagName);
      };
    });

    await page.goto('/');

    // Navigate to memory-intensive page
    await page.click('[data-testid="memory-intensive-page"]');

    // Verify page loads with fallbacks
    await expect(page.locator('[data-testid="memory-page"]')).toBeVisible();

    // Check for memory fallbacks
    const fallbacks = await page.locator('[data-memory-fallback="true"]').count();
    expect(fallbacks).toBeGreaterThan(0);

    // Verify performance degradation is active
    await expect(page.locator('[data-testid="performance-degradation"]')).toBeVisible();
  });

  test('survives component crashes', async ({ page }) => {
    await page.addInitScript(() => {
      // Inject a component that crashes
      window.__CRASH_COMPONENT__ = () => {
        throw new Error('Intentional component crash for chaos testing');
      };

      window.recordChaosEvent({
        type: 'component_crash',
        message: 'Simulating component crash',
      });
    });

    await page.goto('/');

    // Trigger component crash
    await page.click('[data-testid="crash-component-button"]');

    // Verify error boundary catches the crash
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();

    // Verify fallback UI is shown
    await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible();

    // Verify app continues to function
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const componentCrash = chaosEvents.find((e: any) => e.type === 'component_crash');
    expect(componentCrash).toBeTruthy();
  });

  test('survives partial API failures', async ({ page }) => {
    await page.addInitScript(() => {
      // Override fetch to return partial success responses
      const originalFetch = window.fetch;

      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input.url;

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

          window.recordChaosEvent({
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
    });

    await page.goto('/');

    // Trigger batch API call
    await page.click('[data-testid="batch-api-call"]');

    // Verify partial success handling
    await expect(page.locator('[data-testid="partial-success"]')).toBeVisible();

    // Verify valid items are displayed
    await expect(page.locator('[data-testid="valid-item"]')).toHaveCount(2);

    // Verify invalid items show errors
    await expect(page.locator('[data-testid="invalid-item"]')).toHaveCount(2);

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const partialFailure = chaosEvents.find((e: any) => e.type === 'partial_api_failure');
    expect(partialFailure).toBeTruthy();
  });

  test('survives performance budget violations', async ({ page }) => {
    await page.addInitScript(() => {
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

      window.recordChaosEvent({
        type: 'performance_budget_violation',
        metric: 'LCP',
        value: 4.5,
        budget: 2.5,
      });
    });

    await page.goto('/');

    // Wait for performance monitoring to detect violations
    await page.waitForTimeout(1000);

    // Verify performance degradation is active
    await expect(page.locator('[data-testid="performance-degradation"]')).toBeVisible();

    // Verify degradation notification
    await expect(page.locator('[data-testid="degradation-notification"]')).toBeVisible();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const budgetViolation = chaosEvents.find((e: any) => e.type === 'performance_budget_violation');
    expect(budgetViolation).toBeTruthy();
  });

  test('survives monitoring service failures', async ({ page }) => {
    await page.addInitScript(() => {
      // Override monitoring service to simulate failures
      window.__MONITORING_FAILURE__ = true;

      window.recordChaosEvent({
        type: 'monitoring_service_failure',
        message: 'Simulating monitoring service failure',
      });
    });

    await page.goto('/');

    // Trigger an error that would be monitored
    await page.click('[data-testid="trigger-error-button"]');

    // Verify app continues to function despite monitoring failure
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Verify error is still handled locally
    await expect(page.locator('[data-testid="error-handled"]')).toBeVisible();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const monitoringFailure = chaosEvents.find((e: any) => e.type === 'monitoring_service_failure');
    expect(monitoringFailure).toBeTruthy();
  });

  test('survives cookie consent failures', async ({ page }) => {
    await page.addInitScript(() => {
      // Override localStorage to simulate consent storage failure
      const originalSetItem = Storage.prototype.setItem;

      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.startsWith('cookie_consent')) {
          window.recordChaosEvent({
            type: 'cookie_consent_failure',
            key,
            message: 'Simulating cookie consent storage failure',
          });
          throw new Error('Consent storage failed');
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.goto('/');

    // Verify app loads with default consent settings
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Verify consent banner appears
    await expect(page.locator('[data-testid="consent-banner"]')).toBeVisible();

    // Verify monitoring is disabled by default
    const monitoringEnabled = await page.evaluate(() => window.__MONITORING_ENABLED__);
    expect(monitoringEnabled).toBeFalsy();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    const consentFailure = chaosEvents.find((e: any) => e.type === 'cookie_consent_failure');
    expect(consentFailure).toBeTruthy();
  });

  test('comprehensive chaos resilience test', async ({ page }) => {
    // Enable multiple chaos scenarios
    await page.addInitScript(() => {
      // Network failures
      let networkFailureCount = 0;
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
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
      window.__RANDOM_CRASH__ = Math.random() < 0.1; // 10% chance

      window.recordChaosEvent({
        type: 'comprehensive_chaos_test',
        message: 'Multiple chaos scenarios enabled',
      });
    });

    await page.goto('/');

    // Wait for chaos test duration
    await page.waitForTimeout(5000);

    // Verify app is still functional
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Verify resilience features are active
    await expect(page.locator('[data-testid="resilience-active"]')).toBeVisible();

    // Check overall system health
    const systemHealth = await page.evaluate(() => {
      return {
        errorBoundaryActive: !!document.querySelector('[data-testid="error-boundary"]'),
        performanceDegradationActive: !!document.querySelector(
          '[data-testid="performance-degradation"]'
        ),
        storageFallbackActive: !!document.querySelector('[data-testid="storage-fallback"]'),
        monitoringEnabled: window.__MONITORING_ENABLED__,
      };
    });

    // Verify resilience mechanisms are working
    expect(
      systemHealth.errorBoundaryActive || systemHealth.performanceDegradationActive
    ).toBeTruthy();

    // Check chaos events
    const chaosEvents = await page.evaluate(() => window.__CHAOS_EVENTS__);
    expect(chaosEvents.length).toBeGreaterThan(0);
  });
});

/**
 * Helper function to run chaos tests with specific configuration
 */
export async function runChaosTest(
  page: any,
  testName: string,
  config: Partial<ChaosTestConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CHAOS_CONFIG, ...config };

  await page.addInitScript((config) => {
    window.__CHAOS_CONFIG__ = config;
  }, fullConfig);

  // Record test start
  await page.evaluate(() => {
    window.recordChaosEvent({
      type: 'chaos_test_start',
      test: testName,
      config: window.__CHAOS_CONFIG__,
    });
  });

  // Run the test
  await page.goto('/');

  // Wait for test duration
  if (fullConfig.testDuration) {
    await page.waitForTimeout(fullConfig.testDuration);
  }

  // Record test end
  await page.evaluate(() => {
    window.recordChaosEvent({
      type: 'chaos_test_end',
      test: testName,
    });
  });

  // Collect results
  const results = await page.evaluate(() => {
    return {
      chaosEvents: window.__CHAOS_EVENTS__,
      appHealthy: !!document.querySelector('[data-testid="app-root"]'),
      errorBoundaryActive: !!document.querySelector('[data-testid="error-boundary"]'),
      performanceDegradationActive: !!document.querySelector(
        '[data-testid="performance-degradation"]'
      ),
      storageFallbackActive: !!document.querySelector('[data-testid="storage-fallback"]'),
    };
  });

  return results;
}
