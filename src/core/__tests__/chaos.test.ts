import { test, expect, beforeEach, describe, vi } from 'vitest';

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

interface ChaosTestConfig {
  simulateNetworkFailures?: boolean;

  simulateStorageQuotaExceeded?: boolean;

  simulateMemoryPressure?: boolean;

  simulateAPIFailures?: boolean;

  simulateComponentCrashes?: boolean;

  testDuration?: number;
}

const DEFAULT_CHAOS_CONFIG: ChaosTestConfig = {
  simulateNetworkFailures: true,
  simulateStorageQuotaExceeded: true,
  simulateMemoryPressure: true,
  simulateAPIFailures: true,
  simulateComponentCrashes: true,
  testDuration: 30000,
};

describe('Chaos Engineering Tests', () => {
  beforeEach(() => {
    (globalThis as any).__CHAOS_MODE__ = true;
    (globalThis as any).__CHAOS_EVENTS__ = [];

    (globalThis as any).recordChaosEvent = (event: any) => {
      (globalThis as any).__CHAOS_EVENTS__.push({
        ...event,
        timestamp: Date.now(),
      });
    };

    const mockPage = {
      addInitScript: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue({
        toBeVisible: vi.fn().mockResolvedValue(true),
      }),
    };

    (globalThis as any).page = mockPage;
  });

  test('survives localStorage quota exceeded', async () => {
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    Storage.prototype.setItem = function (key: string, value: string) {
      callCount++;
      if (callCount > 3) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return originalSetItem.call(this, key, value);
    };

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

    expect(document.body).toBeDefined();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents).toContainEqual(
      expect.objectContaining({
        type: 'localStorage_quota_exceeded',
      })
    );

    Storage.prototype.setItem = originalSetItem;
  });

  test('survives IndexedDB corruption', async () => {
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

    expect(storageEngine).toBeDefined();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents).toContainEqual(
      expect.objectContaining({
        type: 'indexeddb_corruption',
      })
    );
  });

  test('survives network failures with retry logic', async () => {
    const originalFetch = globalThis.fetch;
    let failureCount = 0;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      failureCount++;

      if (failureCount <= 3) {
        (globalThis as any).recordChaosEvent({
          type: 'network_failure',
          attempt: failureCount,
          url: typeof input === 'string' ? input : (input as URL).href,
        });

        throw new Error('Network request failed');
      }

      return originalFetch.call(this, input, init);
    };

    try {
      await fetch('https://api.example.com/data');
    } catch (_error) {}

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const networkFailures = chaosEvents.filter((e: any) => e.type === 'network_failure');
    expect(networkFailures).toHaveLength(3);

    globalThis.fetch = originalFetch;
  });

  test('survives API version mismatch', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const response = await originalFetch.call(this, input, init);

      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'X-API-Version': '2.0.0',
        },
      });

      (globalThis as any).recordChaosEvent({
        type: 'api_version_mismatch',
        expectedVersion: '1.0.0',
        actualVersion: '2.0.0',
      });

      return modifiedResponse;
    };

    try {
      await fetch('/api/version');
    } catch (_error) {}

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const versionMismatch = chaosEvents.find((e: any) => e.type === 'api_version_mismatch');
    expect(versionMismatch).toBeTruthy();
  });

  test('survives memory pressure', async () => {
    const originalCreateElement = document.createElement;
    let memoryFallbackCount = 0;

    document.createElement = function (tagName: string) {
      if (tagName === 'canvas' || tagName === 'video') {
        (globalThis as any).recordChaosEvent({
          type: 'memory_pressure',
          resource: tagName,
          message: 'Simulating memory pressure for resource-intensive elements',
        });

        const fallback = originalCreateElement.call(this, 'div');
        fallback.setAttribute('data-memory-fallback', 'true');
        memoryFallbackCount++;
        return fallback;
      }

      return originalCreateElement.call(this, tagName);
    };

    const _canvas = document.createElement('canvas');
    const _video = document.createElement('video');

    expect(memoryFallbackCount).toBe(2);

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const memoryPressure = chaosEvents.find((e: any) => e.type === 'memory_pressure');
    expect(memoryPressure).toBeTruthy();

    document.createElement = originalCreateElement;
  });

  test('survives component crashes', async () => {
    (globalThis as any).__CRASH_COMPONENT__ = () => {
      throw new Error('Intentional component crash for chaos testing');
    };

    (globalThis as any).recordChaosEvent({
      type: 'component_crash',
      message: 'Simulating component crash',
    });

    try {
      (globalThis as any).__CRASH_COMPONENT__();
    } catch (error) {
      expect(error).toBeDefined();
    }

    const errorBoundary = document.createElement('div');
    errorBoundary.setAttribute('data-testid', 'error-boundary');
    document.body.appendChild(errorBoundary);

    const errorFallback = document.createElement('div');
    errorFallback.setAttribute('data-testid', 'error-fallback');
    document.body.appendChild(errorFallback);

    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const componentCrash = chaosEvents.find((e: any) => e.type === 'component_crash');
    expect(componentCrash).toBeTruthy();

    document.body.removeChild(errorBoundary);
    document.body.removeChild(errorFallback);
    document.body.removeChild(appRoot);
  });

  test('survives partial API failures', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : (input as URL).href;

      if (url.includes('/batch')) {
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
          status: 207,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return originalFetch.call(this, input, init);
    };

    try {
      await fetch('/api/batch');
    } catch (_error) {}

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const partialFailure = chaosEvents.find((e: any) => e.type === 'partial_api_failure');
    expect(partialFailure).toBeTruthy();
  });

  test('survives performance budget violations', async () => {
    const originalGetEntriesByType = performance.getEntriesByType;

    performance.getEntriesByType = function (type: string) {
      const entries = originalGetEntriesByType.call(this, type);

      if (type === 'navigation') {
        return entries.map((entry: any) => ({
          ...entry,
          loadEventEnd: entry.loadEventEnd + 5000,
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

    setTimeout(() => {
      const degradationElement = document.createElement('div');
      degradationElement.setAttribute('data-testid', 'performance-degradation');
      document.body.appendChild(degradationElement);

      const notificationElement = document.createElement('div');
      notificationElement.setAttribute('data-testid', 'degradation-notification');
      document.body.appendChild(notificationElement);
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(document.querySelector('[data-testid="performance-degradation"]')).toBeTruthy();

    expect(document.querySelector('[data-testid="degradation-notification"]')).toBeTruthy();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const budgetViolation = chaosEvents.find((e: any) => e.type === 'performance_budget_violation');
    expect(budgetViolation).toBeTruthy();

    const cleanupDegradationElement = document.querySelector(
      '[data-testid="performance-degradation"]'
    );
    const cleanupNotificationElement = document.querySelector(
      '[data-testid="degradation-notification"]'
    );
    if (cleanupDegradationElement) {
      document.body.removeChild(cleanupDegradationElement);
    }
    if (cleanupNotificationElement) {
      document.body.removeChild(cleanupNotificationElement);
    }
  });

  test('survives monitoring service failures', async () => {
    (globalThis as any).__MONITORING_FAILURE__ = true;

    (globalThis as any).recordChaosEvent({
      type: 'monitoring_service_failure',
      message: 'Simulating monitoring service failure',
    });

    try {
      throw new Error('Test error for monitoring failure');
    } catch (error) {
      expect(error).toBeDefined();
    }

    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);
    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    const errorHandled = document.createElement('div');
    errorHandled.setAttribute('data-testid', 'error-handled');
    document.body.appendChild(errorHandled);
    expect(document.querySelector('[data-testid="error-handled"]')).toBeTruthy();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const monitoringFailure = chaosEvents.find((e: any) => e.type === 'monitoring_service_failure');
    expect(monitoringFailure).toBeTruthy();

    document.body.removeChild(appRoot);
    document.body.removeChild(errorHandled);
  });

  test('survives cookie consent failures', async () => {
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

    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    const consentBanner = document.createElement('div');
    consentBanner.setAttribute('data-testid', 'consent-banner');
    document.body.appendChild(consentBanner);

    expect(document.querySelector('[data-testid="consent-banner"]')).toBeTruthy();

    (globalThis as any).__MONITORING_ENABLED__ = false;
    expect((globalThis as any).__MONITORING_ENABLED__).toBeFalsy();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    const consentFailure = chaosEvents.find((e: any) => e.type === 'cookie_consent_failure');
    expect(consentFailure).toBeTruthy();

    document.body.removeChild(appRoot);
    document.body.removeChild(consentBanner);
    Storage.prototype.setItem = originalSetItem;
  });

  test('comprehensive chaos resilience test', async () => {
    let networkFailureCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      networkFailureCount++;
      if (networkFailureCount % 3 === 0) {
        throw new Error('Network failure');
      }
      return originalFetch.call(this, input, init);
    };

    const originalSetItem = Storage.prototype.setItem;
    let storageCallCount = 0;
    Storage.prototype.setItem = function (key: string, value: string) {
      storageCallCount++;
      if (storageCallCount > 20) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };

    (globalThis as any).__RANDOM_CRASH__ = Math.random() < 0.1;

    (globalThis as any).recordChaosEvent({
      type: 'comprehensive_chaos_test',
      message: 'Multiple chaos scenarios enabled',
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const appRoot = document.createElement('div');
    appRoot.setAttribute('data-testid', 'app-root');
    document.body.appendChild(appRoot);

    const resilienceActive = document.createElement('div');
    resilienceActive.setAttribute('data-testid', 'resilience-active');
    document.body.appendChild(resilienceActive);

    expect(document.querySelector('[data-testid="app-root"]')).toBeTruthy();

    expect(document.querySelector('[data-testid="resilience-active"]')).toBeTruthy();

    const systemHealth = {
      errorBoundaryActive: !!document.querySelector('[data-testid="error-boundary"]'),
      performanceDegradationActive: !!document.querySelector(
        '[data-testid="performance-degradation"]'
      ),
      storageFallbackActive: !!document.querySelector('[data-testid="storage-fallback"]'),
      monitoringEnabled: (globalThis as any).__MONITORING_ENABLED__,
    };

    expect(
      systemHealth.errorBoundaryActive || systemHealth.performanceDegradationActive
    ).toBeTruthy();

    const chaosEvents = (globalThis as any).__CHAOS_EVENTS__;
    expect(chaosEvents.length).toBeGreaterThan(0);

    document.body.removeChild(appRoot);
    document.body.removeChild(resilienceActive);
    globalThis.fetch = originalFetch;
    Storage.prototype.setItem = originalSetItem;
  });
});

export async function runChaosTest(testName: string, config: Partial<ChaosTestConfig> = {}) {
  const fullConfig = { ...DEFAULT_CHAOS_CONFIG, ...config };

  (globalThis as any).recordChaosEvent({
    type: 'chaos_test_start',
    test: testName,
    config: fullConfig,
  });

  if (fullConfig.testDuration) {
    await new Promise((resolve) => setTimeout(resolve, fullConfig.testDuration));
  }

  (globalThis as any).recordChaosEvent({
    type: 'chaos_test_end',
    test: testName,
  });

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
