/**
 * Enterprise Frontend Foundation Configuration
 * Central configuration for all subsystems
 * 
 * @fileoverview Foundation configuration
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { DefaultBudgets } from './performance/budget.config';
import { SentryAdapter } from './monitoring/adapters/SentryAdapter';
import { ConsoleAdapter } from './monitoring/adapters/ConsoleAdapter';
import type { MonitoringServiceConfig } from './monitoring/MonitoringService';

/**
 * Environment-specific configuration
 */
export const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Feature flags for foundation subsystems
 */
export const FOUNDATION_FEATURES = {
  // Validation system
  VALIDATION: {
    ENABLED: true,
    STRICT_MODE: ENVIRONMENT === 'production',
    DEBUG_MODE: ENVIRONMENT === 'development',
  },
  
  // Storage system
  STORAGE: {
    ENABLED: true,
    AUTO_MIGRATION: true,
    OFFLINE_SUPPORT: true,
    COMPRESSION: ENVIRONMENT === 'production',
  },
  
  // Error boundaries
  ERROR_BOUNDARIES: {
    ENABLED: true,
    AUTO_RECOVERY: true,
    CIRCUIT_BREAKER: true,
    DEVELOPMENT_MODE: ENVIRONMENT === 'development',
  },
  
  // Performance monitoring
  PERFORMANCE: {
    ENABLED: true,
    BUDGET_ENFORCEMENT: ENVIRONMENT === 'production',
    CORE_WEB_VITALS: true,
    CUSTOM_METRICS: true,
  },
  
  // Monitoring system
  MONITORING: {
    ENABLED: true,
    ERROR_REPORTING: ENVIRONMENT === 'production',
    PERFORMANCE_TRACKING: true,
    USER_ACTION_TRACKING: true,
    SAMPLING_RATE: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  },
} as const;

/**
 * Get monitoring adapter based on environment
 */
export function getMonitoringAdapter() {
  if (ENVIRONMENT === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return new SentryAdapter();
  }
  return new ConsoleAdapter({
    colors: true,
    grouping: true,
    maxEvents: 1000,
    showPerformance: true,
    showUserActions: true,
  });
}

/**
 * Default monitoring service configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringServiceConfig = {
  serviceName: 'habit-tracker',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  enabled: FOUNDATION_FEATURES.MONITORING.ENABLED,
  adapter: getMonitoringAdapter(),
  samplingRate: FOUNDATION_FEATURES.MONITORING.SAMPLING_RATE,
  debug: ENVIRONMENT === 'development',
  autoErrorReporting: FOUNDATION_FEATURES.MONITORING.ERROR_REPORTING,
  performanceMonitoring: FOUNDATION_FEATURES.MONITORING.PERFORMANCE_TRACKING,
  userActionTracking: FOUNDATION_FEATURES.MONITORING.USER_ACTION_TRACKING,
  redactionRules: [
    {
      name: 'email-redaction',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
      fields: ['message', 'data.email', 'data.userEmail', 'context.email'],
    },
    {
      name: 'phone-redaction',
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      replacement: '[REDACTED_PHONE]',
      fields: ['message', 'data.phone', 'data.phoneNumber'],
    },
    {
      name: 'ssn-redaction',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: '[REDACTED_SSN]',
      fields: ['message', 'data.ssn', 'data.socialSecurityNumber'],
    },
    {
      name: 'credit-card-redaction',
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: '[REDACTED_CARD]',
      fields: ['message', 'data.cardNumber', 'data.creditCard'],
    },
  ],
  offlineQueue: {
    enabled: true,
    maxSize: 100,
    flushInterval: 30000, // 30 seconds
  },
  contextEnrichers: [
    {
      name: 'device-enricher',
      enrich: async (context) => ({
        deviceType: getDeviceType(),
        screenResolution: getScreenResolution(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    },
    {
      name: 'performance-enricher',
      enrich: async (context) => ({
        connectionType: getConnectionType(),
        memoryInfo: getMemoryInfo(),
      }),
    },
  ],
  enableOfflineQueue: FOUNDATION_FEATURES.STORAGE.OFFLINE_SUPPORT,
  maxQueueSize: 100,
  queueFlushInterval: 30000,
  enableSessionTracking: true,
  sessionTimeout: 1800000, // 30 minutes
};

/**
 * Get device type for context enrichment
 */
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'server';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get screen resolution for context enrichment
 */
function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'unknown';
  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * Get connection type for context enrichment
 */
function getConnectionType(): string {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'unknown';
  }
  
  const connection = (navigator as any).connection;
  return connection.effectiveType || 'unknown';
}

/**
 * Get memory info for context enrichment
 */
function getMemoryInfo(): Record<string, number> | undefined {
  if (typeof performance === 'undefined' || !('memory' in performance)) {
    return undefined;
  }
  
  const memory = (performance as any).memory;
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
  };
}

/**
 * Error boundary default configuration
 */
export const DEFAULT_ERROR_BOUNDARY_CONFIG = {
  retry: true,
  retryAttempts: ENVIRONMENT === 'development' ? 5 : 3,
  retryDelay: 1000,
  maxErrorRate: 5,
  errorRateWindow: 60000, // 1 minute
  enableWarnings: true,
  enableStrictMode: FOUNDATION_FEATURES.VALIDATION.STRICT_MODE,
};

/**
 * Performance budget configuration by environment
 */
export const getPerformanceBudgetConfig = () => {
  switch (ENVIRONMENT) {
    case 'production':
      return DefaultBudgets.production;
    case 'development':
      return DefaultBudgets.development;
    case 'test':
      return DefaultBudgets.testing;
    default:
      return DefaultBudgets.development;
  }
};

/**
 * Storage default configuration
 */
export const DEFAULT_STORAGE_CONFIG = {
  backend: 'localStorage' as const,
  keyPrefix: 'habit-tracker',
  compression: FOUNDATION_FEATURES.STORAGE.COMPRESSION,
  encryption: false, // Enable if storing sensitive data
  ttl: undefined, // No expiration by default
  maxSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Foundation initialization options
 */
export interface FoundationInitOptions {
  /**
   * Override default monitoring config
   */
  monitoring?: Partial<MonitoringServiceConfig>;
  
  /**
   * Override performance budget
   */
  performanceBudget?: any;
  
  /**
   * Override error boundary config
   */
  errorBoundary?: any;
  
  /**
   * Override storage config
   */
  storage?: any;
  
  /**
   * Enable/disable specific features
   */
  features?: Partial<typeof FOUNDATION_FEATURES>;
}

/**
 * Initialize the entire frontend foundation
 */
export function initializeFoundation(options: FoundationInitOptions = {}) {
  const config = {
    monitoring: { ...DEFAULT_MONITORING_CONFIG, ...options.monitoring },
    performance: getPerformanceBudgetConfig(),
    errorBoundary: { ...DEFAULT_ERROR_BOUNDARY_CONFIG, ...options.errorBoundary },
    storage: { ...DEFAULT_STORAGE_CONFIG, ...options.storage },
    features: { ...FOUNDATION_FEATURES, ...options.features },
  };

  // Validate configuration
  if (ENVIRONMENT === 'production' && config.monitoring.samplingRate > 0.5) {
    console.warn('High sampling rate in production may impact performance');
  }

  if (config.storage.maxSize > 50 * 1024 * 1024) {
    console.warn('Large storage size may cause quota exceeded errors');
  }

  return config;
}

/**
 * Get foundation health status
 */
export function getFoundationHealth() {
  return {
    validation: FOUNDATION_FEATURES.VALIDATION.ENABLED,
    storage: FOUNDATION_FEATURES.STORAGE.ENABLED,
    errorBoundaries: FOUNDATION_FEATURES.ERROR_BOUNDARIES.ENABLED,
    performance: FOUNDATION_FEATURES.PERFORMANCE.ENABLED,
    monitoring: FOUNDATION_FEATURES.MONITORING.ENABLED,
    environment: ENVIRONMENT,
    features: FOUNDATION_FEATURES,
  };
}

/**
 * Export all configuration for easy consumption
 */
export const FOUNDATION_CONFIG = {
  environment: ENVIRONMENT,
  features: FOUNDATION_FEATURES,
  monitoring: DEFAULT_MONITORING_CONFIG,
  performance: getPerformanceBudgetConfig(),
  errorBoundary: DEFAULT_ERROR_BOUNDARY_CONFIG,
  storage: DEFAULT_STORAGE_CONFIG,
  initialize: initializeFoundation,
  getHealth: getFoundationHealth,
};
