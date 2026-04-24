/**
 * Console monitoring adapter implementation
 * Provides development-friendly console output for monitoring events
 * 
 * @fileoverview Console adapter for monitoring system
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { MonitoringAdapter, MonitoringConfig, ErrorEvent, PerformanceEvent, UserActionEvent, MonitoringBreadcrumb, MonitoringContext, MonitoringEvent } from '../types';

/**
 * Console adapter configuration
 */
export interface ConsoleAdapterConfig {
  /**
   * Enable colored output
   */
  colors: boolean;
  
  /**
   * Enable grouping of related events
   */
  grouping: boolean;
  
  /**
   * Maximum number of events to keep in memory
   */
  maxEvents: number;
  
  /**
   * Enable performance metrics
   */
  showPerformance: boolean;
  
  /**
   * Enable user action tracking
   */
  showUserActions: boolean;
}

/**
 * Console monitoring adapter
 */
export class ConsoleAdapter implements MonitoringAdapter {
  readonly name = 'console';
  private config: ConsoleAdapterConfig;
  private events: any[] = [];
  private initialized = false;

  constructor(config: Partial<ConsoleAdapterConfig> = {}) {
    this.config = {
      colors: true,
      grouping: true,
      maxEvents: 1000,
      showPerformance: true,
      showUserActions: true,
      ...config,
    };
  }

  async initialize(config: MonitoringConfig): Promise<void> {
    if (this.initialized) {
      console.warn('Console adapter already initialized');
      return;
    }

    this.initialized = true;
    console.log('Console adapter initialized');
    
    if (config.debug) {
      console.log('Debug mode enabled for console adapter');
    }
  }

  async captureError(event: ErrorEvent): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.storeEvent(event);

    const style = this.getErrorStyle(event.severity);
    const prefix = this.config.colors ? `%c[${event.severity.toUpperCase()}]` : `[${event.severity.toUpperCase()}]`;
    
    if (this.config.grouping) {
      console.group(`${prefix} ${event.message}`, style);
    } else {
      console.log(`${prefix} ${event.message}`, style);
    }

    console.log('Error Details:', {
      name: event.error.name,
      message: event.error.message,
      stack: event.error.stack,
      type: event.error.type,
      code: event.error.code,
    });

    if (event.errorInfo) {
      console.log('Error Info:', event.errorInfo);
    }

    if (event.context) {
      console.log('Context:', event.context);
    }

    if (event.data) {
      console.log('Data:', event.data);
    }

    if (this.config.grouping) {
      console.groupEnd();
    }
  }

  async captureMessage(event: MonitoringEvent): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.storeEvent(event);

    const style = this.getMessageStyle(event.severity);
    const prefix = this.config.colors ? `%c[${event.severity.toUpperCase()}]` : `[${event.severity.toUpperCase()}]`;
    
    console.log(`${prefix} ${event.message}`, style, {
      category: event.category,
      timestamp: new Date(event.timestamp).toISOString(),
      data: event.data,
      context: event.context,
      tags: event.tags,
    });
  }

  async captureEvent(event: MonitoringEvent): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.storeEvent(event);

    // Handle different event types
    switch (event.category) {
      case 'performance':
        if (this.config.showPerformance) {
          this.logPerformanceEvent(event as PerformanceEvent);
        }
        break;
      
      case 'user_action':
        if (this.config.showUserActions) {
          this.logUserActionEvent(event as UserActionEvent);
        }
        break;
      
      default:
        console.log(`[${event.category.toUpperCase()}] ${event.message}`, event);
    }
  }

  async setUser(userId: string, attributes?: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const style = this.config.colors ? 'color: #2196F3; font-weight: bold;' : '';
    const prefix = this.config.colors ? '%c[USER]' : '[USER]';
    
    console.log(`${prefix} User context set`, style, {
      userId,
      attributes,
      timestamp: new Date().toISOString(),
    });
  }

  async addBreadcrumb(breadcrumb: MonitoringBreadcrumb): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const style = this.config.colors ? 'color: #9E9E9E; font-size: 0.9em;' : '';
    const prefix = this.config.colors ? '%c[BREADCRUMB]' : '[BREADCRUMB]';
    
    console.log(`${prefix} ${breadcrumb.message}`, style, {
      category: breadcrumb.category,
      level: breadcrumb.level,
      timestamp: new Date(breadcrumb.timestamp).toISOString(),
      data: breadcrumb.data,
    });
  }

  async setTag(key: string, value: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const style = this.config.colors ? 'color: #FF9800; font-size: 0.9em;' : '';
    const prefix = this.config.colors ? '%c[TAG]' : '[TAG]';
    
    console.log(`${prefix} ${key}: ${value}`, style);
  }

  async setContext(key: string, value: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const style = this.config.colors ? 'color: #FF9800; font-size: 0.9em;' : '';
    const prefix = this.config.colors ? '%c[CONTEXT]' : '[CONTEXT]';
    
    console.log(`${prefix} ${key}`, style, value);
  }

  async cleanup(): Promise<void> {
    this.events = [];
    this.initialized = false;
    console.log('Console adapter cleaned up');
  }

  /**
   * Store event in memory
   */
  private storeEvent(event: any): void {
    this.events.push(event);
    
    // Keep only the most recent events
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Log performance event with special formatting
   */
  private logPerformanceEvent(event: PerformanceEvent): void {
    const style = event.metric.breached 
      ? 'color: #F44336; font-weight: bold;'
      : 'color: #4CAF50; font-weight: bold;';
    
    const prefix = this.config.colors ? '%c[PERFORMANCE]' : '[PERFORMANCE]';
    const breachText = event.metric.breached ? ' (BUDGET BREACHED)' : '';
    
    console.log(
      `${prefix} ${event.metric.name}: ${event.metric.value}${event.metric.unit}${breachText}`,
      style,
      {
        metric: event.metric,
        timing: event.timing,
        timestamp: new Date(event.timestamp).toISOString(),
      }
    );
  }

  /**
   * Log user action event with special formatting
   */
  private logUserActionEvent(event: UserActionEvent): void {
    const style = 'color: #2196F3; font-weight: bold;';
    const prefix = this.config.colors ? '%c[USER ACTION]' : '[USER ACTION]';
    
    console.log(
      `${prefix} ${event.action.type} on ${event.action.target}`,
      style,
      {
        action: event.action,
        interaction: event.interaction,
        timestamp: new Date(event.timestamp).toISOString(),
      }
    );
  }

  /**
   * Get style for error messages
   */
  private getErrorStyle(severity: string): string {
    if (!this.config.colors) {
      return '';
    }

    switch (severity) {
      case 'debug':
        return 'color: #9E9E9E;';
      case 'info':
        return 'color: #2196F3;';
      case 'warning':
        return 'color: #FF9800;';
      case 'error':
        return 'color: #F44336; font-weight: bold;';
      case 'critical':
        return 'color: #D32F2F; font-weight: bold; background: #FFEBEE; padding: 2px 4px;';
      default:
        return 'color: #666;';
    }
  }

  /**
   * Get style for general messages
   */
  private getMessageStyle(severity: string): string {
    return this.getErrorStyle(severity);
  }

  /**
   * Get stored events for debugging
   */
  getStoredEvents(): any[] {
    return [...this.events];
  }

  /**
   * Clear stored events
   */
  clearStoredEvents(): void {
    this.events = [];
  }

  /**
   * Export events for analysis
   */
  exportEvents(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      adapter: this.name,
      events: this.events,
      config: this.config,
    }, null, 2);
  }
}

/**
 * Factory function to create console adapter
 */
export function createConsoleAdapter(config?: Partial<ConsoleAdapterConfig>): ConsoleAdapter {
  return new ConsoleAdapter(config);
}
