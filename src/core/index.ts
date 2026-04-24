/**
 * Enterprise Frontend Foundation - Main Exports
 *
 * @fileoverview Main foundation exports
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import {
  ENVIRONMENT,
  FOUNDATION_CONFIG,
  FOUNDATION_FEATURES,
} from './FOUNDATION_CONFIG';

// ============================================================================
// SUBSYSTEM EXPORTS
// ============================================================================

export * from './validation';
export * from './storage';
export * from './error-boundary';
export * from './performance';
export * from './monitoring';
export * from './FOUNDATION_CONFIG';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Foundation utilities for common operations
 */
export const FoundationUtils = {
  /**
   * Check if running in development mode
   */
  isDevelopment: () => ENVIRONMENT === 'development',

  /**
   * Check if running in production mode
   */
  isProduction: () => ENVIRONMENT === 'production',

  /**
   * Check if running in test mode
   */
  isTest: () => ENVIRONMENT === 'test',

  /**
   * Get current environment
   */
  getEnvironment: () => ENVIRONMENT,

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled: (feature: keyof typeof FOUNDATION_FEATURES) =>
    FOUNDATION_FEATURES[feature].ENABLED,

  /**
   * Get foundation health status
   */
  getHealth: () => ({
    validation: FOUNDATION_FEATURES.VALIDATION.ENABLED,
    storage: FOUNDATION_FEATURES.STORAGE.ENABLED,
    errorBoundaries: FOUNDATION_FEATURES.ERROR_BOUNDARIES.ENABLED,
    performance: FOUNDATION_FEATURES.PERFORMANCE.ENABLED,
    monitoring: FOUNDATION_FEATURES.MONITORING.ENABLED,
    environment: ENVIRONMENT,
  }),
} as const;

/**
 * Default foundation instance for quick usage
 */
export const Foundation = {
  ...FOUNDATION_CONFIG,
  utils: FoundationUtils,
} as const;

// ============================================================================
// VERSION INFORMATION
// ============================================================================

export const FOUNDATION_VERSION = '1.0.0';
export const FOUNDATION_BUILD_DATE = new Date().toISOString();

/**
 * Foundation metadata for debugging and diagnostics
 */
export const FoundationMetadata = {
  version: FOUNDATION_VERSION,
  buildDate: FOUNDATION_BUILD_DATE,
  environment: ENVIRONMENT,
  features: Object.keys(FOUNDATION_FEATURES),
  subsystems: [
    'validation',
    'storage',
    'error-boundary',
    'performance',
    'monitoring',
  ],
} as const;
