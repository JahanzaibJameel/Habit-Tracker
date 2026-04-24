/**
 * Production Monitoring Layer Exports
 * Tree-shakable exports for unified telemetry system
 */

// Core monitoring service
export { MonitoringService } from './MonitoringService';

// Monitoring hooks (use specific exports to avoid conflicts)
export { useMonitoring as useMonitoringService, useMonitoringDashboard } from './useMonitoring';

// Monitoring types and configuration
export type {
  MonitoringSeverity,
  MonitoringCategory,
  MonitoringEvent,
  ErrorEvent,
  PerformanceEvent,
  UserActionEvent,
  SystemEvent,
  BusinessEvent,
  SecurityEvent,
  MonitoringAdapter,
  MonitoringBreadcrumb,
  MonitoringContext,
  MonitoringStats,
  MonitoringFilter,
  MonitoringExportOptions,
  ContextEnricher,
  AnyMonitoringEvent,
  MonitoringConfig,
  RedactionRule as MonitoringRedactionRule,
} from './types';

export { MonitoringEventFactory } from './types';

// Monitoring adapters
export { ConsoleAdapter } from './adapters/ConsoleAdapter';
export { SentryAdapter, createSentryAdapter } from './adapters/SentryAdapter';

// Offline queue and data redaction
export { OfflineQueue } from './OfflineQueue';
export {
  DataRedactor,
  DEFAULT_REDACTION_RULES,
  validateRedactionRules,
  createCustomFieldRules,
} from './DataRedaction';
export type { RedactionRule as DataRedactionRule } from './DataRedaction';

// Monitoring provider
export { MonitoringProvider, useMonitoring as useMonitoringContext } from './MonitoringProvider';
