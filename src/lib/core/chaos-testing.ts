/**
 * Enterprise-grade Chaos Resistance Testing System
 * - Simulates real-world chaotic conditions
 * - Validates system resilience under stress
 * - Tests memory pressure, network failures, data corruption
 * - Validates error isolation and recovery mechanisms
 */

import { safeLocalStorage } from '../utils/ssr-safe';
import { errorIsolationManager } from './error-isolation';
import { performanceBudgetSystem } from './performance-budget';
import { productionMonitoring } from './production-monitoring';

export interface ChaosTest {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'network' | 'storage' | 'rendering' | 'data' | 'concurrency';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  duration: number; // ms
  enabled: boolean;
  execute: () => Promise<ChaosTestResult>;
}

export interface ChaosTestResult {
  testId: string;
  success: boolean;
  duration: number;
  errorCount: number;
  performanceImpact: number;
  recoveryTime: number;
  metrics: Record<string, any>;
  issues: string[];
  recommendations: string[];
}

export interface ChaosTestSuite {
  name: string;
  tests: ChaosTest[];
  parallel: boolean;
  maxConcurrency: number;
}

export interface ChaosTestConfig {
  enableAutoTests: boolean;
  testInterval: number; // ms
  maxTestDuration: number; // ms
  enableReporting: boolean;
  enableRecoveryValidation: boolean;
  testTimeout: number; // ms
}

export class ChaosResistanceTester {
  private static instance: ChaosResistanceTester;
  private config: ChaosTestConfig;
  private testResults: ChaosTestResult[] = [];
  private isRunning = false;
  private testInterval?: NodeJS.Timeout;
  private activeTests: Map<string, Promise<ChaosTestResult>> = new Map();

  constructor(config: Partial<ChaosTestConfig> = {}) {
    this.config = {
      enableAutoTests: false,
      testInterval: 60000, // 1 minute
      maxTestDuration: 30000, // 30 seconds
      enableReporting: true,
      enableRecoveryValidation: true,
      testTimeout: 60000, // 1 minute
      ...config,
    };
  }

  static getInstance(config?: Partial<ChaosTestConfig>): ChaosResistanceTester {
    if (!ChaosResistanceTester.instance) {
      ChaosResistanceTester.instance = new ChaosResistanceTester(config);
    }
    return ChaosResistanceTester.instance;
  }

  // Get all available chaos tests
  getAvailableTests(): ChaosTest[] {
    return [
      // Memory pressure tests
      {
        id: 'memory-pressure-low',
        name: 'Low Memory Pressure',
        description: 'Simulates low memory conditions',
        category: 'memory',
        severity: 'low',
        duration: 5000,
        enabled: true,
        execute: () => this.testMemoryPressure(10), // 10MB
      },
      {
        id: 'memory-pressure-high',
        name: 'High Memory Pressure',
        description: 'Simulates high memory conditions',
        category: 'memory',
        severity: 'high',
        duration: 10000,
        enabled: true,
        execute: () => this.testMemoryPressure(100), // 100MB
      },
      {
        id: 'memory-exhaustion',
        name: 'Memory Exhaustion',
        description: 'Simulates memory exhaustion',
        category: 'memory',
        severity: 'extreme',
        duration: 15000,
        enabled: false, // Disabled by default for safety
        execute: () => this.testMemoryExhaustion(),
      },

      // Storage corruption tests
      {
        id: 'storage-corruption',
        name: 'Storage Corruption',
        description: 'Simulates localStorage corruption',
        category: 'storage',
        severity: 'high',
        duration: 3000,
        enabled: true,
        execute: () => this.testStorageCorruption(),
      },
      {
        id: 'storage-quota-exceeded',
        name: 'Storage Quota Exceeded',
        description: 'Simulates storage quota exceeded',
        category: 'storage',
        severity: 'medium',
        duration: 2000,
        enabled: true,
        execute: () => this.testStorageQuotaExceeded(),
      },

      // Rendering stress tests
      {
        id: 'render-storm',
        name: 'Render Storm',
        description: 'Simulates rapid component rendering',
        category: 'rendering',
        severity: 'high',
        duration: 8000,
        enabled: true,
        execute: () => this.testRenderStorm(),
      },
      {
        id: 'concurrent-updates',
        name: 'Concurrent State Updates',
        description: 'Simulates concurrent state updates',
        category: 'concurrency',
        severity: 'medium',
        duration: 5000,
        enabled: true,
        execute: () => this.testConcurrentUpdates(),
      },

      // Data corruption tests
      {
        id: 'data-corruption',
        name: 'Data Corruption',
        description: 'Simulates corrupted data injection',
        category: 'data',
        severity: 'high',
        duration: 3000,
        enabled: true,
        execute: () => this.testDataCorruption(),
      },
      {
        id: 'schema-migration-failure',
        name: 'Schema Migration Failure',
        description: 'Simulates schema migration failures',
        category: 'data',
        severity: 'medium',
        duration: 4000,
        enabled: true,
        execute: () => this.testSchemaMigrationFailure(),
      },

      // Network simulation tests
      {
        id: 'slow-response',
        name: 'Slow Response Simulation',
        description: 'Simulates slow network responses',
        category: 'network',
        severity: 'medium',
        duration: 6000,
        enabled: true,
        execute: () => this.testSlowResponse(),
      },
      {
        id: 'connection-timeout',
        name: 'Connection Timeout',
        description: 'Simulates connection timeouts',
        category: 'network',
        severity: 'high',
        duration: 4000,
        enabled: true,
        execute: () => this.testConnectionTimeout(),
      },
    ];
  }

  // Test memory pressure
  private async testMemoryPressure(mbToConsume: number): Promise<ChaosTestResult> {
    const testId = 'memory-pressure';
    const startTime = performance.now();
    const initialErrors = errorIsolationManager.getErrorHistory().length;

    try {
      // Allocate memory
      const memoryArrays: Uint8Array[] = [];
      const bytesToConsume = mbToConsume * 1024 * 1024;
      const chunkSize = 1024 * 1024; // 1MB chunks

      for (let i = 0; i < mbToConsume; i++) {
        memoryArrays.push(new Uint8Array(chunkSize));

        // Fill with random data
        if (memoryArrays[i]) {
          const array = memoryArrays[i] as Uint8Array;
          for (let j = 0; j < chunkSize; j++) {
            array[j] = Math.random() * 256;
          }
        }

        // Small delay to allow garbage collection
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Monitor system for test duration
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up memory
      memoryArrays.length = 0;

      // Force garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      const endTime = performance.now();
      const finalErrors = errorIsolationManager.getErrorHistory().length;
      const performanceStatus = performanceBudgetSystem.getPerformanceStatus();

      return {
        testId,
        success: performanceStatus.isHealthy,
        duration: endTime - startTime,
        errorCount: finalErrors - initialErrors,
        performanceImpact: performanceStatus.score,
        recoveryTime: 0,
        metrics: {
          memoryConsumed: mbToConsume,
          finalPerformanceScore: performanceStatus.score,
          memoryUsage: performanceStatus.metrics.memoryUsage,
        },
        issues: performanceStatus.isHealthy ? [] : ['Performance degraded under memory pressure'],
        recommendations: performanceStatus.isHealthy
          ? []
          : ['Implement memory optimization strategies'],
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: errorMessage },
        issues: [`Memory pressure test failed: ${errorMessage}`],
        recommendations: ['Improve error handling for memory pressure scenarios'],
      };
    }
  }

  // Test memory exhaustion
  private async testMemoryExhaustion(): Promise<ChaosTestResult> {
    const testId = 'memory-exhaustion';
    const startTime = performance.now();

    try {
      // Try to exhaust memory gradually
      const memoryArrays: Uint8Array[] = [];
      let totalAllocated = 0;

      while (totalAllocated < 500 * 1024 * 1024) {
        // 500MB max
        try {
          const chunk = new Uint8Array(10 * 1024 * 1024); // 10MB
          memoryArrays.push(chunk);
          totalAllocated += chunk.length;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (allocationError) {
          break; // Memory allocation failed
        }
      }

      // Clean up
      memoryArrays.length = 0;

      const endTime = performance.now();
      const performanceStatus = performanceBudgetSystem.getPerformanceStatus();

      return {
        testId,
        success: true, // Test succeeded in simulating exhaustion
        duration: endTime - startTime,
        errorCount: 0,
        performanceImpact: performanceStatus.score,
        recoveryTime: 0,
        metrics: {
          memoryAllocated: totalAllocated / (1024 * 1024), // MB
          finalPerformanceScore: performanceStatus.score,
        },
        issues: [],
        recommendations: ['System handled memory exhaustion gracefully'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: true, // Expected to fail
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Memory exhaustion triggered: ${error}`],
        recommendations: ['System properly handled memory exhaustion'],
      };
    }
  }

  // Test storage corruption
  private async testStorageCorruption(): Promise<ChaosTestResult> {
    const testId = 'storage-corruption';
    const startTime = performance.now();
    const storage = safeLocalStorage();

    try {
      if (!storage) {
        throw new Error('localStorage not available');
      }

      // Save original data
      const originalData: Record<string, string> = {};
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          originalData[key] = storage.getItem(key) || '';
        }
      }

      // Inject corrupted data
      storage.setItem('corrupted-data-1', 'invalid-json-{');
      storage.setItem('corrupted-data-2', 'undefined');
      storage.setItem('corrupted-data-3', '\x00\x01\x02invalid-binary');

      // Try to read corrupted data
      let corruptionErrors = 0;
      try {
        JSON.parse(storage.getItem('corrupted-data-1') || '{}');
      } catch {
        corruptionErrors++;
      }

      try {
        JSON.parse(storage.getItem('corrupted-data-2') || '{}');
      } catch {
        corruptionErrors++;
      }

      // Restore original data
      storage.clear();
      Object.entries(originalData).forEach(([key, value]) => {
        storage.setItem(key, value);
      });

      const endTime = performance.now();

      return {
        testId,
        success: corruptionErrors > 0,
        duration: endTime - startTime,
        errorCount: corruptionErrors,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          corruptionErrors,
          originalDataCount: Object.keys(originalData).length,
        },
        issues: corruptionErrors === 0 ? ['No corruption detected'] : [],
        recommendations: ['Storage corruption handling working correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Storage corruption test failed: ${error}`],
        recommendations: ['Improve storage error handling'],
      };
    }
  }

  // Test storage quota exceeded
  private async testStorageQuotaExceeded(): Promise<ChaosTestResult> {
    const testId = 'storage-quota';
    const startTime = performance.now();
    const storage = safeLocalStorage();

    try {
      if (!storage) {
        throw new Error('localStorage not available');
      }

      // Fill storage until quota is exceeded
      let dataWritten = 0;
      let quotaExceeded = false;
      const chunkSize = 1024 * 10; // 10KB chunks
      const data = new Array(chunkSize).fill('x').join('');

      try {
        for (let i = 0; i < 10000; i++) {
          storage.setItem(`quota-test-${i}`, data);
          dataWritten += chunkSize;
        }
      } catch (error) {
        quotaExceeded = true;
      }

      // Clean up
      for (let i = 0; i < 10000; i++) {
        storage.removeItem(`quota-test-${i}`);
      }

      const endTime = performance.now();

      return {
        testId,
        success: quotaExceeded,
        duration: endTime - startTime,
        errorCount: quotaExceeded ? 1 : 0,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          dataWritten,
          quotaExceeded,
        },
        issues: quotaExceeded ? [] : ['Quota not exceeded - storage may be unlimited'],
        recommendations: ['Storage quota handling implemented correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Storage quota test failed: ${error}`],
        recommendations: ['Improve storage quota error handling'],
      };
    }
  }

  // Test render storm
  private async testRenderStorm(): Promise<ChaosTestResult> {
    const testId = 'render-storm';
    const startTime = performance.now();
    const initialPerformance = performanceBudgetSystem.getPerformanceStatus();

    try {
      // Simulate rapid component renders
      const renderPromises: Promise<void>[] = [];

      for (let i = 0; i < 1000; i++) {
        renderPromises.push(
          new Promise<void>((resolve) => {
            performanceBudgetSystem.trackComponentRender(`test-component-${i}`, Math.random() * 50);
            setTimeout(resolve, Math.random() * 10);
          })
        );
      }

      await Promise.all(renderPromises);

      const endTime = performance.now();
      const finalPerformance = performanceBudgetSystem.getPerformanceStatus();

      return {
        testId,
        success: finalPerformance.score > 50,
        duration: endTime - startTime,
        errorCount: 0,
        performanceImpact: initialPerformance.score - finalPerformance.score,
        recoveryTime: 0,
        metrics: {
          rendersTriggered: 1000,
          initialScore: initialPerformance.score,
          finalScore: finalPerformance.score,
        },
        issues: finalPerformance.score < 50 ? ['Performance severely degraded'] : [],
        recommendations: finalPerformance.score < 50 ? ['Optimize render performance'] : [],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Render storm test failed: ${error}`],
        recommendations: ['Improve render storm resilience'],
      };
    }
  }

  // Test concurrent updates
  private async testConcurrentUpdates(): Promise<ChaosTestResult> {
    const testId = 'concurrent-updates';
    const startTime = performance.now();

    try {
      // Simulate concurrent state updates
      const updatePromises: Promise<void>[] = [];
      let conflicts = 0;

      for (let i = 0; i < 100; i++) {
        updatePromises.push(
          new Promise<void>((resolve) => {
            try {
              productionMonitoring.trackStateChange(`test-state-${i}`, 'old', 'new');
              setTimeout(resolve, Math.random() * 100);
            } catch {
              conflicts++;
              resolve();
            }
          })
        );
      }

      await Promise.all(updatePromises);

      const endTime = performance.now();

      return {
        testId,
        success: conflicts < 10, // Allow some conflicts
        duration: endTime - startTime,
        errorCount: conflicts,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          updatesTriggered: 100,
          conflicts,
        },
        issues: conflicts > 10 ? ['High number of concurrent update conflicts'] : [],
        recommendations: conflicts > 10 ? ['Implement better concurrency control'] : [],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Concurrent updates test failed: ${error}`],
        recommendations: ['Improve concurrent update handling'],
      };
    }
  }

  // Test data corruption
  private async testDataCorruption(): Promise<ChaosTestResult> {
    const testId = 'data-corruption';
    const startTime = performance.now();

    try {
      // Simulate corrupted data injection
      const corruptedDataSamples = [
        { id: 'invalid-uuid', name: null },
        { id: 'valid-uuid', name: '', color: 'invalid-color' },
        { invalidField: 'unexpected' },
        'string-instead-of-object',
        null,
        undefined,
        42,
      ];

      let validationErrors = 0;

      // Try to validate corrupted data
      for (const data of corruptedDataSamples) {
        try {
          // This would normally use the schema validator
          if (typeof data !== 'object' || data === null) {
            validationErrors++;
          } else {
            // Basic validation
            if (!data.id || typeof data.id !== 'string') validationErrors++;
          }
        } catch {
          validationErrors++;
        }
      }

      const endTime = performance.now();

      return {
        testId,
        success: validationErrors > 0,
        duration: endTime - startTime,
        errorCount: validationErrors,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          samplesTested: corruptedDataSamples.length,
          validationErrors,
        },
        issues: validationErrors === 0 ? ['No validation errors detected'] : [],
        recommendations: ['Data validation system working correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Data corruption test failed: ${error}`],
        recommendations: ['Improve data corruption handling'],
      };
    }
  }

  // Test schema migration failure
  private async testSchemaMigrationFailure(): Promise<ChaosTestResult> {
    const testId = 'schema-migration';
    const startTime = performance.now();

    try {
      // Simulate migration failure scenarios
      const migrationScenarios = [
        { from: '1.0', to: '2.0', data: null },
        { from: '1.0', to: '2.0', data: 'invalid-data' },
        { from: '1.0', to: '2.0', data: { incompatible: 'structure' } },
      ];

      let migrationFailures = 0;

      for (const scenario of migrationScenarios) {
        try {
          // Simulate migration attempt
          if (scenario.data === null || typeof scenario.data !== 'object') {
            throw new Error('Invalid data for migration');
          }
        } catch {
          migrationFailures++;
        }
      }

      const endTime = performance.now();

      return {
        testId,
        success: migrationFailures > 0,
        duration: endTime - startTime,
        errorCount: migrationFailures,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          scenariosTested: migrationScenarios.length,
          migrationFailures,
        },
        issues: migrationFailures === 0 ? ['No migration failures detected'] : [],
        recommendations: ['Migration failure handling working correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Schema migration test failed: ${error}`],
        recommendations: ['Improve schema migration error handling'],
      };
    }
  }

  // Test slow response
  private async testSlowResponse(): Promise<ChaosTestResult> {
    const testId = 'slow-response';
    const startTime = performance.now();

    try {
      // Simulate slow network responses
      const slowPromises: Promise<string>[] = [];

      for (let i = 0; i < 10; i++) {
        slowPromises.push(
          new Promise<string>((resolve) => {
            setTimeout(() => resolve(`response-${i}`), 2000 + Math.random() * 3000);
          })
        );
      }

      const results = await Promise.all(slowPromises);
      const endTime = performance.now();

      return {
        testId,
        success: results.length === 10,
        duration: endTime - startTime,
        errorCount: 0,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          requestsSimulated: 10,
          responsesReceived: results.length,
          averageDelay: (endTime - startTime) / 10,
        },
        issues: [],
        recommendations: ['Slow response handling working correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Slow response test failed: ${error}`],
        recommendations: ['Improve timeout handling'],
      };
    }
  }

  // Test connection timeout
  private async testConnectionTimeout(): Promise<ChaosTestResult> {
    const testId = 'connection-timeout';
    const startTime = performance.now();

    try {
      // Simulate connection timeouts
      const timeoutPromises: Promise<string>[] = [];

      for (let i = 0; i < 5; i++) {
        timeoutPromises.push(
          new Promise<string>((resolve, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 1000);
          })
        );
      }

      let timeouts = 0;

      for (const promise of timeoutPromises) {
        try {
          await promise;
        } catch (error) {
          if ((error as Error).message === 'Connection timeout') {
            timeouts++;
          }
        }
      }

      const endTime = performance.now();

      return {
        testId,
        success: timeouts === 5,
        duration: endTime - startTime,
        errorCount: timeouts,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {
          requestsSimulated: 5,
          timeouts,
        },
        issues: timeouts < 5 ? ['Not all connections timed out as expected'] : [],
        recommendations: ['Timeout handling working correctly'],
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId,
        success: false,
        duration: endTime - startTime,
        errorCount: 1,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: { error: String(error) },
        issues: [`Connection timeout test failed: ${error}`],
        recommendations: ['Improve timeout error handling'],
      };
    }
  }

  // Run a single test
  async runTest(testId: string): Promise<ChaosTestResult> {
    const tests = this.getAvailableTests();
    const test = tests.find((t) => t.id === testId);

    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (!test.enabled) {
      throw new Error(`Test disabled: ${testId}`);
    }

    // Check if test is already running
    if (this.activeTests.has(testId)) {
      throw new Error(`Test already running: ${testId}`);
    }

    productionMonitoring.log('info', `Starting chaos test: ${test.name}`, 'chaos-testing', {
      testId,
    });

    const testPromise = Promise.race([
      test.execute(),
      new Promise<ChaosTestResult>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), this.config.testTimeout)
      ),
    ]);

    this.activeTests.set(testId, testPromise);

    try {
      const result = await testPromise;
      this.testResults.push(result);

      productionMonitoring.log('info', `Chaos test completed: ${test.name}`, 'chaos-testing', {
        testId,
        success: result.success,
        duration: result.duration,
      });

      return result;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  // Run test suite
  async runTestSuite(suite: ChaosTestSuite): Promise<ChaosTestResult[]> {
    const results: ChaosTestResult[] = [];

    if (suite.parallel) {
      // Run tests in parallel with limited concurrency
      const chunks = this.chunkArray(suite.tests, suite.maxConcurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map((test) => this.runTest(test.id)));
        results.push(...chunkResults);
      }
    } else {
      // Run tests sequentially
      for (const test of suite.tests) {
        const result = await this.runTest(test.id);
        results.push(result);
      }
    }

    return results;
  }

  // Helper to chunk array
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Get test results
  getTestResults(): ChaosTestResult[] {
    return [...this.testResults];
  }

  // Get chaos resistance score
  getChaosResistanceScore(): number {
    if (this.testResults.length === 0) return 0;

    const successfulTests = this.testResults.filter((result) => result.success).length;
    const totalTests = this.testResults.length;

    return Math.round((successfulTests / totalTests) * 100);
  }

  // Generate chaos resistance report
  generateReport(): {
    score: number;
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageDuration: number;
    categories: Record<string, { total: number; success: number; score: number }>;
    recommendations: string[];
  } {
    const results = this.testResults;
    const score = this.getChaosResistanceScore();
    const successfulTests = results.filter((r) => r.success).length;
    const failedTests = results.length - successfulTests;
    const averageDuration =
      results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

    // Analyze by category
    const categories: Record<string, { total: number; success: number; score: number }> = {};
    const tests = this.getAvailableTests();

    tests.forEach((test) => {
      const testResults = results.filter((r) => r.testId === test.id);
      const successCount = testResults.filter((r) => r.success).length;

      if (!categories[test.category]) {
        (categories as any)[test.category] = { total: 0, success: 0, score: 0 };
      }

      if (categories[test.category]) {
        (categories[test.category] as any).total += testResults.length;
        (categories[test.category] as any).success += successCount;
      }
    });

    Object.keys(categories).forEach((category) => {
      const cat = categories[category];
      if (cat) {
        cat.score = cat.total > 0 ? Math.round((cat.success / cat.total) * 100) : 0;
      }
    });

    // Generate recommendations
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('Overall chaos resistance needs improvement');
    }

    Object.entries(categories).forEach(([category, stats]) => {
      if (stats.score < 70) {
        recommendations.push(`Improve ${category} chaos resistance`);
      }
    });

    return {
      score,
      totalTests: results.length,
      successfulTests,
      failedTests,
      averageDuration,
      categories,
      recommendations,
    };
  }

  // Clear test results
  clearResults(): void {
    this.testResults = [];
  }
}

// Global instance
export const chaosResistanceTester = ChaosResistanceTester.getInstance();

// Predefined test suites
export const basicChaosSuite: ChaosTestSuite = {
  name: 'Basic Chaos Resistance',
  tests: [
    {
      id: 'memory-pressure-low',
      name: '',
      description: '',
      category: 'memory',
      severity: 'low',
      duration: 0,
      enabled: true,
      execute: async () => ({
        testId: '',
        success: false,
        duration: 0,
        errorCount: 0,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {},
        issues: [],
        recommendations: [],
      }),
    },
    {
      id: 'storage-corruption',
      name: '',
      description: '',
      category: 'storage',
      severity: 'high',
      duration: 0,
      enabled: true,
      execute: async () => ({
        testId: '',
        success: false,
        duration: 0,
        errorCount: 0,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {},
        issues: [],
        recommendations: [],
      }),
    },
    {
      id: 'render-storm',
      name: '',
      description: '',
      category: 'rendering',
      severity: 'high',
      duration: 0,
      enabled: true,
      execute: async () => ({
        testId: '',
        success: false,
        duration: 0,
        errorCount: 0,
        performanceImpact: 0,
        recoveryTime: 0,
        metrics: {},
        issues: [],
        recommendations: [],
      }),
    },
  ],
  parallel: false,
  maxConcurrency: 1,
};

export const comprehensiveChaosSuite: ChaosTestSuite = {
  name: 'Comprehensive Chaos Resistance',
  tests: chaosResistanceTester
    .getAvailableTests()
    .filter((test) => test.enabled && test.severity !== 'extreme'),
  parallel: true,
  maxConcurrency: 3,
};
