/**
 * Enterprise Architecture Integration Layer
 * - Integrates all enterprise systems
 * - Provides unified interface for chaos resistance
 * - Coordinates between monitoring, validation, and error handling
 */

import { chaosResistanceTester, comprehensiveChaosSuite } from './chaos-testing';
import { ErrorClassifier, errorIsolationManager } from './error-isolation';
import { ComponentBoundary, FeatureBoundary, GlobalBoundary } from './error-isolation-components';
import { performanceBudgetSystem, usePerformanceBudget } from './performance-budget';
import { log, productionMonitoring, traceEvent } from './production-monitoring';
import { schemaRegistry } from './schema-validation';
import { habitMigrationEngine, preferencesMigrationEngine } from './storage-migration';

export interface EnterpriseSystemStatus {
  schemaValidation: boolean;
  storageMigration: boolean;
  errorIsolation: boolean;
  performanceBudget: boolean;
  productionMonitoring: boolean;
  chaosTesting: boolean;
  overallHealth: boolean;
}

export interface EnterpriseConfig {
  enableSchemaValidation: boolean;
  enableStorageMigration: boolean;
  enableErrorIsolation: boolean;
  enablePerformanceBudget: boolean;
  enableProductionMonitoring: boolean;
  enableChaosTesting: boolean;
  autoStartMonitoring: boolean;
  performanceBudget: {
    renderTime: number;
    memoryUsage: number;
    reRenderFrequency: number;
  };
}

export class EnterpriseArchitecture {
  private static instance: EnterpriseArchitecture;
  private config: EnterpriseConfig;
  private isInitialized = false;
  private initializationTime = 0;

  constructor(config: Partial<EnterpriseConfig> = {}) {
    this.config = {
      enableSchemaValidation: true,
      enableStorageMigration: true,
      enableErrorIsolation: true,
      enablePerformanceBudget: true,
      enableProductionMonitoring: true,
      enableChaosTesting: true,
      autoStartMonitoring: true,
      performanceBudget: {
        renderTime: 16, // 60fps
        memoryUsage: 50, // 50MB
        reRenderFrequency: 10, // per minute
      },
      ...config,
    };
  }

  static getInstance(config?: Partial<EnterpriseConfig>): EnterpriseArchitecture {
    if (!EnterpriseArchitecture.instance) {
      EnterpriseArchitecture.instance = new EnterpriseArchitecture(config);
    }
    return EnterpriseArchitecture.instance;
  }

  // Initialize all enterprise systems
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const startTime = performance.now();

    try {
      log('info', 'Initializing enterprise architecture', 'enterprise', { config: this.config });

      // 1. Initialize Production Monitoring (must be first)
      if (this.config.enableProductionMonitoring) {
        productionMonitoring.initialize();
        log('info', 'Production monitoring initialized', 'enterprise');
      }

      // 2. Initialize Schema Validation
      if (this.config.enableSchemaValidation) {
        await this.initializeSchemaValidation();
        log('info', 'Schema validation initialized', 'enterprise');
      }

      // 3. Initialize Storage Migration
      if (this.config.enableStorageMigration) {
        await this.initializeStorageMigration();
        log('info', 'Storage migration initialized', 'enterprise');
      }

      // 4. Initialize Error Isolation
      if (this.config.enableErrorIsolation) {
        await this.initializeErrorIsolation();
        log('info', 'Error isolation initialized', 'enterprise');
      }

      // 5. Initialize Performance Budget
      if (this.config.enablePerformanceBudget) {
        await this.initializePerformanceBudget();
        log('info', 'Performance budget initialized', 'enterprise');
      }

      // 6. Initialize Chaos Testing
      if (this.config.enableChaosTesting) {
        await this.initializeChaosTesting();
        log('info', 'Chaos testing initialized', 'enterprise');
      }

      // 7. Start auto-monitoring if enabled
      if (this.config.autoStartMonitoring) {
        this.startAutoMonitoring();
        log('info', 'Auto-monitoring started', 'enterprise');
      }

      this.isInitialized = true;
      this.initializationTime = performance.now() - startTime;

      log('info', 'Enterprise architecture initialized successfully', 'enterprise', {
        initializationTime: this.initializationTime,
        systemsEnabled: this.getSystemStatus(),
      });
    } catch (error) {
      log('critical', 'Enterprise architecture initialization failed', 'enterprise', { error });
      throw error;
    }
  }

  // Initialize Schema Validation
  private async initializeSchemaValidation(): Promise<void> {
    // Validate that core schemas are registered
    const habitValidatorExists = schemaRegistry.getValidator('habit') !== undefined;
    const preferencesValidatorExists = schemaRegistry.getValidator('preferences') !== undefined;

    if (!habitValidatorExists) {
      throw new Error('Habit validator not registered');
    }

    if (!preferencesValidatorExists) {
      throw new Error('Preferences validator not registered');
    }

    // Test validation with sample data
    const sampleHabit = {
      id: 'test-id',
      name: 'Test Habit',
      icon: 'test',
      color: '#000000',
      category: 'test',
      target: 1,
      unit: 'unit',
      frequency: 'daily',
      createdAt: new Date(),
      updatedAt: new Date(),
      position: 0,
      isPublic: false,
      tags: [],
    };

    const validationResult = await schemaRegistry.validateData('habit', sampleHabit);
    if (!validationResult.isValid) {
      throw new Error('Schema validation test failed');
    }
  }

  // Initialize Storage Migration
  private async initializeStorageMigration(): Promise<void> {
    // Check migration engine status
    const habitStatus = habitMigrationEngine.getStatus();
    const preferencesStatus = preferencesMigrationEngine.getStatus();

    if (habitStatus.corruptionDetected) {
      log('warn', 'Habit storage corruption detected', 'enterprise');
    }

    if (preferencesStatus.corruptionDetected) {
      log('warn', 'Preferences storage corruption detected', 'enterprise');
    }
  }

  // Initialize Error Isolation
  private async initializeErrorIsolation(): Promise<void> {
    // Test error classification
    const testError = new Error('Test error for initialization');
    const classifiedError = ErrorClassifier.classify(testError);

    if (!classifiedError.id || !classifiedError.category) {
      throw new Error('Error classification test failed');
    }

    // Check error isolation health
    const healthStatus = errorIsolationManager.getHealthStatus();
    if (!healthStatus.isHealthy) {
      log('warn', 'Error isolation system not healthy', 'enterprise', healthStatus);
    }
  }

  // Initialize Performance Budget
  private async initializePerformanceBudget(): Promise<void> {
    // Update performance budget with config
    performanceBudgetSystem.updateBudget(this.config.performanceBudget);

    // Start performance monitoring
    performanceBudgetSystem.startMonitoring();

    // Test performance tracking
    const testTraceId = traceEvent('performance', 'initialization_test');
    performanceBudgetSystem.trackComponentRender('enterprise-init', 5); // 5ms render
  }

  // Initialize Chaos Testing
  private async initializeChaosTesting(): Promise<void> {
    // Test basic chaos functionality
    const availableTests = chaosResistanceTester.getAvailableTests();

    if (availableTests.length === 0) {
      throw new Error('No chaos tests available');
    }

    // Run a simple validation test
    const validationTest = availableTests.find((t) => t.id === 'data-corruption');
    if (validationTest && validationTest.enabled) {
      try {
        const result = await chaosResistanceTester.runTest('data-corruption');
        log('info', 'Chaos test validation completed', 'enterprise', {
          testId: 'data-corruption',
          success: result.success,
        });
      } catch (error) {
        log('warn', 'Chaos test validation failed', 'enterprise', { error });
      }
    }
  }

  // Start auto-monitoring
  private startAutoMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  // Perform health check
  private performHealthCheck(): void {
    const systemStatus = this.getSystemStatus();
    const performanceStatus = performanceBudgetSystem.getPerformanceStatus();
    const errorHealth = errorIsolationManager.getHealthStatus();

    // Log health status
    log('info', 'Enterprise architecture health check', 'enterprise', {
      systemStatus,
      performanceStatus,
      errorHealth,
    });

    // Trigger alerts if needed
    if (!systemStatus.overallHealth) {
      log('warn', 'Enterprise architecture health issues detected', 'enterprise', {
        systemStatus,
        performanceStatus,
        errorHealth,
      });
    }
  }

  // Get system status
  getSystemStatus(): EnterpriseSystemStatus {
    return {
      schemaValidation: this.config.enableSchemaValidation,
      storageMigration: this.config.enableStorageMigration,
      errorIsolation: this.config.enableErrorIsolation,
      performanceBudget: this.config.enablePerformanceBudget,
      productionMonitoring: this.config.enableProductionMonitoring,
      chaosTesting: this.config.enableChaosTesting,
      overallHealth: this.calculateOverallHealth(),
    };
  }

  // Calculate overall health
  private calculateOverallHealth(): boolean {
    const performanceStatus = performanceBudgetSystem.getPerformanceStatus();
    const errorHealth = errorIsolationManager.getHealthStatus();
    const chaosScore = chaosResistanceTester.getChaosResistanceScore();

    return performanceStatus.isHealthy && errorHealth.isHealthy && chaosScore >= 70;
  }

  // Get enterprise dashboard data
  getDashboardData(): {
    systemStatus: EnterpriseSystemStatus;
    performanceStatus: any;
    errorStats: any;
    chaosScore: number;
    monitoringData: any;
    initializationTime: number;
  } {
    return {
      systemStatus: this.getSystemStatus(),
      performanceStatus: performanceBudgetSystem.getPerformanceStatus(),
      errorStats: errorIsolationManager.getErrorStats(),
      chaosScore: chaosResistanceTester.getChaosResistanceScore(),
      monitoringData: productionMonitoring.getDashboardData(),
      initializationTime: this.initializationTime,
    };
  }

  // Run comprehensive chaos test
  async runComprehensiveChaosTest(): Promise<any> {
    if (!this.config.enableChaosTesting) {
      throw new Error('Chaos testing is disabled');
    }

    log('info', 'Starting comprehensive chaos test', 'enterprise');

    try {
      const results = await chaosResistanceTester.runTestSuite(comprehensiveChaosSuite);
      const report = chaosResistanceTester.generateReport();

      log('info', 'Comprehensive chaos test completed', 'enterprise', {
        score: report.score,
        totalTests: report.totalTests,
        successfulTests: report.successfulTests,
      });

      return { results, report };
    } catch (error) {
      log('error', 'Comprehensive chaos test failed', 'enterprise', { error });
      throw error;
    }
  }

  // Get React components for error boundaries
  getErrorBoundaryComponents() {
    return {
      GlobalBoundary,
      FeatureBoundary,
      ComponentBoundary,
    };
  }

  // Get hooks for performance tracking
  getPerformanceHooks() {
    return {
      usePerformanceBudget,
    };
  }

  // Shutdown all systems
  async shutdown(): Promise<void> {
    log('info', 'Shutting down enterprise architecture', 'enterprise');

    try {
      // Stop performance monitoring
      performanceBudgetSystem.stopMonitoring();

      // Clear monitoring data if needed
      // productionMonitoring.clearData();

      log('info', 'Enterprise architecture shutdown complete', 'enterprise');
    } catch (error) {
      log('error', 'Enterprise architecture shutdown failed', 'enterprise', { error });
      throw error;
    }
  }
}

// Global instance
export const enterpriseArchitecture = EnterpriseArchitecture.getInstance();

// Initialize function for app startup
export async function initializeEnterpriseArchitecture(
  config?: Partial<EnterpriseConfig>
): Promise<void> {
  await enterpriseArchitecture.initialize();
}

// Export convenience functions
export const getEnterpriseStatus = () => enterpriseArchitecture.getSystemStatus();
export const getEnterpriseDashboard = () => enterpriseArchitecture.getDashboardData();
export const runChaosTest = () => enterpriseArchitecture.runComprehensiveChaosTest();
