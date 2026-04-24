/**
 * Core monitoring types and interfaces
 * Defines the unified telemetry system architecture
 * 
 * @fileoverview Monitoring system type definitions
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/**
 * Monitoring event severity levels
 */
export enum MonitoringSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Monitoring event categories
 */
export enum MonitoringCategory {
  ERROR = 'error',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
  BUSINESS = 'business',
  SECURITY = 'security',
}

/**
 * Base monitoring event structure
 */
export interface MonitoringEvent {
  id: string;
  timestamp: number;
  severity: MonitoringSeverity;
  category: MonitoringCategory;
  message: string;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
  context?: Partial<MonitoringContext>;
}

/**
 * Monitoring context information
 */
export interface MonitoringContext {
  /**
   * Application version
   */
  appVersion: string;
  
  /**
   * Environment (development, staging, production)
   */
  environment: string;
  
  /**
   * Release identifier
   */
  release?: string;
  
  /**
   * Current route/URL
   */
  url: string;
  
  /**
   * User identifier (hashed/anonymized)
   */
  userId?: string;
  
  /**
   * Device/browser fingerprint
   */
  fingerprint: string;
  
  /**
   * Error boundary context
   */
  errorBoundaryId?: string;
  
  /**
   * Session identifier
   */
  sessionId: string;
  
  /**
   * Custom context fields
   */
  [key: string]: unknown;
}

/**
 * Error monitoring event
 */
export interface ErrorEvent extends MonitoringEvent {
  category: MonitoringCategory.ERROR;
  error: {
    name: string;
    message: string;
    stack?: string;
    type?: string;
    code?: string;
  };
  errorInfo?: {
    componentStack?: string;
    boundary?: string;
    line?: number;
    column?: number;
  };
}

/**
 * Performance monitoring event
 */
export interface PerformanceEvent extends MonitoringEvent {
  category: MonitoringCategory.PERFORMANCE;
  metric: {
    name: string;
    value: number;
    unit: string;
    budget?: number;
    breached?: boolean;
  };
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}

/**
 * User action monitoring event
 */
export interface UserActionEvent extends MonitoringEvent {
  category: MonitoringCategory.USER_ACTION;
  action: {
    type: string;
    target: string;
    properties?: Record<string, unknown>;
  };
  interaction?: {
    method: 'click' | 'tap' | 'keyboard' | 'voice' | 'gesture';
    coordinates?: { x: number; y: number };
    timestamp: number;
  };
}

/**
 * System monitoring event
 */
export interface SystemEvent extends MonitoringEvent {
  category: MonitoringCategory.SYSTEM;
  system: {
    component: string;
    status: 'healthy' | 'degraded' | 'failed';
    metrics?: Record<string, number>;
  };
}

/**
 * Business monitoring event
 */
export interface BusinessEvent extends MonitoringEvent {
  category: MonitoringCategory.BUSINESS;
  business: {
    event: string;
    properties: Record<string, unknown>;
    value?: number;
    currency?: string;
  };
}

/**
 * Security monitoring event
 */
export interface SecurityEvent extends MonitoringEvent {
  category: MonitoringCategory.SECURITY;
  security: {
    type: 'authentication' | 'authorization' | 'data_access' | 'vulnerability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source?: string;
    target?: string;
  };
}

/**
 * Monitoring adapter interface
 */
export interface MonitoringAdapter {
  /**
   * Adapter name
   */
  readonly name: string;
  
  /**
   * Initialize the adapter
   */
  initialize(config: MonitoringConfig): Promise<void>;
  
  /**
   * Capture an error event
   */
  captureError(event: ErrorEvent): Promise<void>;
  
  /**
   * Capture a message event
   */
  captureMessage(event: MonitoringEvent): Promise<void>;
  
  /**
   * Capture a custom event
   */
  captureEvent(event: MonitoringEvent): Promise<void>;
  
  /**
   * Set user context
   */
  setUser(userId: string, attributes?: Record<string, unknown>): Promise<void>;
  
  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: MonitoringBreadcrumb): Promise<void>;
  
  /**
   * Set tag
   */
  setTag(key: string, value: string): Promise<void>;
  
  /**
   * Set context
   */
  setContext(key: string, value: Record<string, unknown>): Promise<void>;
  
  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * Monitoring breadcrumb for user journey tracking
 */
export interface MonitoringBreadcrumb {
  id: string;
  timestamp: number;
  message: string;
  category?: string;
  level?: MonitoringSeverity;
  data?: Record<string, unknown>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /**
   * Adapter to use
   */
  adapter: MonitoringAdapter;
  
  /**
   * Enable/disable monitoring
   */
  enabled: boolean;
  
  /**
   * Sampling rate (0-1)
   */
  samplingRate: number;
  
  /**
   * Enable debug mode
   */
  debug: boolean;
  
  /**
   * Context information for monitoring
   */
  context?: {
    environment?: string;
    release?: string;
  };
  
  /**
   * Enable automatic error reporting
   */
  autoErrorReporting: boolean;
  
  /**
   * Enable performance monitoring
   */
  performanceMonitoring: boolean;
  
  /**
   * Enable user action tracking
   */
  userActionTracking: boolean;
  
  /**
   * Data redaction rules
   */
  redactionRules: RedactionRule[];
  
  /**
   * Offline queue configuration
   */
  offlineQueue: {
    enabled: boolean;
    maxSize: number;
    flushInterval: number;
  };
  
  /**
   * Custom context enrichers
   */
  contextEnrichers: ContextEnricher[];
}

/**
 * Data redaction rule
 */
export interface RedactionRule {
  /**
   * Rule name
   */
  name: string;
  
  /**
   * Pattern to match (regex)
   */
  pattern: RegExp;
  
  /**
   * Replacement value
   */
  replacement: string;
  
  /**
   * Fields to apply to (wildcards supported)
   */
  fields: string[];
}

/**
 * Context enricher function
 */
export interface ContextEnricher {
  /**
   * Enricher name
   */
  name: string;
  
  /**
   * Enrichment function
   */
  enrich: (context: MonitoringContext) => Promise<Partial<MonitoringContext>>;
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  /**
   * Total events captured
   */
  totalEvents: number;
  
  /**
   * Events by category
   */
  eventsByCategory: Record<MonitoringCategory, number>;
  
  /**
   * Events by severity
   */
  eventsBySeverity: Record<MonitoringSeverity, number>;
  
  /**
   * Queue size
   */
  queueSize: number;
  
  /**
   * Last event timestamp
   */
  lastEventTimestamp: number;
  
  /**
   * Adapter status
   */
  adapterStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * Monitoring filter options
 */
export interface MonitoringFilter {
  categories?: MonitoringCategory[];
  severities?: MonitoringSeverity[];
  timeRange?: {
    start: number;
    end: number;
  };
  tags?: Record<string, string>;
  search?: string;
}

/**
 * Monitoring export options
 */
export interface MonitoringExportOptions {
  format: 'json' | 'csv' | 'xml';
  filter?: MonitoringFilter;
  includeContext?: boolean;
  includeBreadcrumbs?: boolean;
}

/**
 * Union type for all monitoring events
 */
export type AnyMonitoringEvent = 
  | ErrorEvent
  | PerformanceEvent
  | UserActionEvent
  | SystemEvent
  | BusinessEvent
  | SecurityEvent;

/**
 * Monitoring event factory
 */
export class MonitoringEventFactory {
  /**
   * Create an error event
   */
  static createError(
    error: Error,
    context?: Partial<MonitoringContext>,
    errorInfo?: any
  ): ErrorEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.ERROR,
      category: MonitoringCategory.ERROR,
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
      },
      errorInfo,
      context,
    };
  }

  /**
   * Create a performance event
   */
  static createPerformance(
    name: string,
    value: number,
    unit: string,
    context?: Partial<MonitoringContext>,
    budget?: number
  ): PerformanceEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.PERFORMANCE,
      message: `Performance metric: ${name}`,
      metric: {
        name,
        value,
        unit,
        budget,
        breached: budget ? value > budget : undefined,
      },
      context,
    };
  }

  /**
   * Create a user action event
   */
  static createUserAction(
    actionType: string,
    target: string,
    properties?: Record<string, unknown>,
    context?: Partial<MonitoringContext>
  ): UserActionEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.USER_ACTION,
      message: `User action: ${actionType} on ${target}`,
      action: {
        type: actionType,
        target,
        properties,
      },
      interaction: {
        method: 'click',
        timestamp: Date.now(),
      },
      context,
    };
  }

  /**
   * Create a system event
   */
  static createSystem(
    component: string,
    status: 'healthy' | 'degraded' | 'failed',
    message: string,
    metrics?: Record<string, number>,
    context?: Partial<MonitoringContext>
  ): SystemEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: status === 'failed' ? MonitoringSeverity.ERROR : MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message,
      system: {
        component,
        status,
        metrics,
      },
      context,
    };
  }

  /**
   * Create a business event
   */
  static createBusiness(
    event: string,
    properties: Record<string, unknown>,
    message?: string,
    value?: number,
    currency?: string,
    context?: Partial<MonitoringContext>
  ): BusinessEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.BUSINESS,
      message: message || `Business event: ${event}`,
      business: {
        event,
        properties,
        value,
        currency,
      },
      context,
    };
  }

  /**
   * Create a security event
   */
  static createSecurity(
    type: 'authentication' | 'authorization' | 'data_access' | 'vulnerability',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    source?: string,
    target?: string,
    context?: Partial<MonitoringContext>
  ): SecurityEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: severity === 'critical' ? MonitoringSeverity.CRITICAL : 
                severity === 'high' ? MonitoringSeverity.ERROR : MonitoringSeverity.WARNING,
      category: MonitoringCategory.SECURITY,
      message,
      security: {
        type,
        severity,
        source,
        target,
      },
      context,
    };
  }

  /**
   * Generate unique event ID
   */
  private static generateId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
