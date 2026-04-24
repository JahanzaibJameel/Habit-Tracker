/**
 * Sentry monitoring adapter implementation
 * Provides integration with Sentry error tracking and performance monitoring
 * 
 * @fileoverview Sentry adapter for monitoring system
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import * as Sentry from '@sentry/browser';
import React from 'react';
import { MonitoringAdapter, MonitoringConfig, ErrorEvent, PerformanceEvent, UserActionEvent, MonitoringBreadcrumb, MonitoringContext, AnyMonitoringEvent } from '../types';

/**
 * Sentry adapter configuration
 */
export interface SentryAdapterConfig {
  /**
   * Sentry DSN
   */
  dsn: string;
  
  /**
   * Environment
   */
  environment: string;
  
  /**
   * Release version
   */
  release?: string;
  
  /**
   * Sample rate for error tracking (0-1)
   */
  sampleRate?: number;
  
  /**
   * Sample rate for performance monitoring (0-1)
   */
  tracesSampleRate?: number;
  
  /**
   * Enable debug mode
   */
  debug?: boolean;
  
  /**
   * Before send hook for filtering/modifying events
   */
  beforeSend?: (event: Sentry.Event, hint?: Sentry.EventHint) => Sentry.Event | null;
  
  /**
   * Before breadcrumb hook
   */
  beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb, hint?: Sentry.BreadcrumbHint) => Sentry.Breadcrumb | null;
}

/**
 * Sentry monitoring adapter
 */
export class SentryAdapter implements MonitoringAdapter {
  readonly name = 'sentry';
  private config: SentryAdapterConfig | null = null;
  private initialized = false;

  async initialize(config: MonitoringConfig): Promise<void> {
    if (this.initialized) {
      console.warn('Sentry adapter already initialized');
      return;
    }

    if (!config.enabled) {
      console.log('Sentry monitoring disabled');
      return;
    }

    // Extract Sentry-specific config from monitoring config
    this.config = {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
      environment: config.context?.environment || process.env.NODE_ENV || 'development',
      release: config.context?.release,
      sampleRate: config.samplingRate,
      tracesSampleRate: config.performanceMonitoring ? 0.1 : 0,
      debug: config.debug,
    };

    if (!this.config.dsn) {
      console.warn('Sentry DSN not provided, skipping initialization');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate,
        tracesSampleRate: this.config.tracesSampleRate,
        debug: this.config.debug,
        beforeSend: this.config.beforeSend as any,
        beforeBreadcrumb: this.config.beforeBreadcrumb as any,
        integrations: [
          // Note: BrowserTracing and reactRouterV6Instrumentation may not be available
          // in the installed Sentry version. Using basic configuration.
        ],
      });

      this.initialized = true;
      console.log('Sentry adapter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry adapter:', error);
      throw error;
    }
  }

  async captureError(event: ErrorEvent): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      const sentryEvent: any = {
        event_id: event.id,
        timestamp: new Date(event.timestamp).toISOString(),
        level: this.mapSeverity(event.severity),
        message: event.message,
        platform: 'javascript',
        exception: {
          values: [{
            type: event.error.name,
            value: event.error.message,
            stacktrace: event.error.stack ? {
              frames: event.error.stack ? this.parseStackTrace(event.error.stack) : undefined,
            } : undefined,
          }],
        },
        tags: event.tags,
        extra: {
          ...event.data,
          category: event.category,
          errorBoundaryId: event.context?.errorBoundaryId,
        },
        contexts: {
          custom: event.context,
        },
        user: event.context?.userId ? {
          id: event.context.userId,
        } : undefined,
      };

      // Add component stack if available
      if (event.errorInfo?.componentStack) {
        sentryEvent.contexts = {
          ...sentryEvent.contexts,
          react: {
            componentStack: event.errorInfo.componentStack,
          },
        };
      }

      Sentry.captureException(event.error, {
        contexts: sentryEvent.contexts,
        tags: sentryEvent.tags,
        extra: sentryEvent.extra,
        user: sentryEvent.user,
      });
    } catch (error) {
      console.error('Failed to capture error in Sentry:', error);
    }
  }

  async captureMessage(event: AnyMonitoringEvent): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.captureMessage(event.message, {
        level: this.mapSeverity(event.severity),
        tags: event.tags,
        extra: {
          ...event.data,
          category: event.category,
        },
        contexts: {
          custom: event.context,
        },
      });
    } catch (error) {
      console.error('Failed to capture message in Sentry:', error);
    }
  }

  async captureEvent(event: AnyMonitoringEvent): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.addBreadcrumb({
        message: event.message,
        category: event.category,
        level: this.mapSeverity(event.severity),
        data: event.data,
        timestamp: event.timestamp / 1000, // Sentry expects seconds
      });

      // For performance events, also capture as transaction
      if (event.category === 'performance') {
        const perfEvent = event as PerformanceEvent;
        // Note: startTransaction may not be available in this Sentry version
        // Transaction tracking disabled for compatibility
      }
    } catch (error) {
      console.error('Failed to capture event in Sentry:', error);
    }
  }

  async setUser(userId: string, attributes?: Record<string, unknown>): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.setUser({
        id: userId,
        ...attributes,
      });
    } catch (error) {
      console.error('Failed to set user in Sentry:', error);
    }
  }

  async addBreadcrumb(breadcrumb: MonitoringBreadcrumb): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: this.mapSeverity(breadcrumb.level || 'info'),
        data: breadcrumb.data,
        timestamp: breadcrumb.timestamp / 1000, // Sentry expects seconds
      });
    } catch (error) {
      console.error('Failed to add breadcrumb in Sentry:', error);
    }
  }

  async setTag(key: string, value: string): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      console.error('Failed to set tag in Sentry:', error);
    }
  }

  async setContext(key: string, value: Record<string, unknown>): Promise<void> {
    if (!this.initialized || !this.config) {
      return;
    }

    try {
      Sentry.setContext(key, value);
    } catch (error) {
      console.error('Failed to set context in Sentry:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.initialized) {
      Sentry.close();
      this.initialized = false;
    }
  }

  /**
   * Map monitoring severity to Sentry level
   */
  private mapSeverity(severity: string): Sentry.SeverityLevel {
    switch (severity) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'critical':
        return 'fatal';
      default:
        return 'info';
    }
  }

  /**
   * Parse stack trace for Sentry
   */
  private parseStackTrace(stack: string): Sentry.StackFrame[] {
    if (!stack) {
      return [];
    }

    return stack.split('\n').map((line, index) => ({
      filename: line.split(':')[0] || 'unknown',
      function: line.split('at ')[1] || 'unknown',
      lineno: parseInt(line.split(':')[1] || '0'),
      colno: parseInt(line.split(':')[2] || '0'),
    }));
  }
}

/**
 * Factory function to create Sentry adapter
 */
export function createSentryAdapter(config?: Partial<SentryAdapterConfig>): SentryAdapter {
  return new SentryAdapter();
}
