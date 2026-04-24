/**
 * Unified monitoring service that integrates all subsystems
 * Provides enterprise-grade telemetry with privacy-preserving features
 * 
 * @fileoverview Main monitoring service implementation
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { 
  MonitoringAdapter, 
  MonitoringConfig, 
  MonitoringEvent, 
  ErrorEvent, 
  PerformanceEvent, 
  UserActionEvent, 
  SystemEvent, 
  BusinessEvent, 
  SecurityEvent,
  MonitoringBreadcrumb,
  MonitoringContext,
  MonitoringStats,
  MonitoringFilter,
  MonitoringExportOptions,
  RedactionRule,
  ContextEnricher,
  MonitoringEventFactory,
  AnyMonitoringEvent,
  MonitoringSeverity,
  MonitoringCategory
} from './types';

/**
 * Monitoring service configuration
 */
export interface MonitoringServiceConfig extends MonitoringConfig {
  /**
   * Service name
   */
  serviceName: string;
  
  /**
   * Service version
   */
  serviceVersion: string;
  
  /**
   * Enable offline queue
   */
  enableOfflineQueue: boolean;
  
  /**
   * Maximum queue size
   */
  maxQueueSize: number;
  
  /**
   * Queue flush interval (ms)
   */
  queueFlushInterval: number;
  
  /**
   * Enable session tracking
   */
  enableSessionTracking: boolean;
  
  /**
   * Session timeout (ms)
   */
  sessionTimeout: number;
}

/**
 * Monitoring service that coordinates all monitoring activities
 */
export class MonitoringService {
  private config: MonitoringServiceConfig;
  private adapter: MonitoringAdapter;
  private initialized = false;
  private events: MonitoringEvent[] = [];
  private queue: MonitoringEvent[] = [];
  private context: MonitoringContext;
  private breadcrumbs: MonitoringBreadcrumb[] = [];
  private sessionStartTime: number;
  private flushTimer?: NodeJS.Timeout;
  private sessionTimer?: NodeJS.Timeout;
  private stats: MonitoringStats;

  constructor(config: MonitoringServiceConfig) {
    this.config = config;
    this.adapter = config.adapter;
    this.sessionStartTime = Date.now();
    
    // Initialize context
    this.context = this.createBaseContext();
    
    // Initialize stats
    this.stats = {
      totalEvents: 0,
      eventsByCategory: {} as any,
      eventsBySeverity: {} as any,
      queueSize: 0,
      lastEventTimestamp: 0,
      adapterStatus: 'disconnected',
    };
  }

  /**
   * Initialize the monitoring service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Monitoring service already initialized');
      return;
    }

    if (!this.config.enabled) {
      console.log('Monitoring service disabled');
      return;
    }

    try {
      // Initialize adapter
      await this.adapter.initialize(this.config);
      this.stats.adapterStatus = 'connected';

      // Start session tracking
      if (this.config.enableSessionTracking) {
        this.startSessionTracking();
      }

      // Start queue processing
      if (this.config.enableOfflineQueue) {
        this.startQueueProcessing();
      }

      // Capture initial system event
      await this.captureEvent(
        MonitoringEventFactory.createSystem(
          'monitoring_service',
          'healthy',
          'Monitoring service initialized',
          {
            samplingRate: this.config.samplingRate,
            performanceMonitoring: this.config.performanceMonitoring ? 1 : 0,
            userActionTracking: this.config.userActionTracking ? 1 : 0,
            autoErrorReporting: this.config.autoErrorReporting ? 1 : 0,
          }
        )
      );

      this.initialized = true;
      console.log('Monitoring service initialized successfully');
    } catch (error) {
      this.stats.adapterStatus = 'error';
      console.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  /**
   * Capture an error event
   */
  async captureError(error: Error, context?: Partial<MonitoringContext>, errorInfo?: any): Promise<void> {
    if (!this.shouldCapture()) return;

    const event = MonitoringEventFactory.createError(error, context, errorInfo);
    await this.processEvent(event);
  }

  /**
   * Capture a performance event
   */
  async capturePerformance(
    name: string,
    value: number,
    unit: string,
    context?: Partial<MonitoringContext>,
    budget?: number
  ): Promise<void> {
    if (!this.shouldCapture()) return;

    const event = MonitoringEventFactory.createPerformance(name, value, unit, context, budget);
    await this.processEvent(event);
  }

  /**
   * Capture a user action event
   */
  async captureUserAction(
    actionType: string,
    target: string,
    properties?: Record<string, unknown>,
    context?: Partial<MonitoringContext>
  ): Promise<void> {
    if (!this.shouldCapture() || !this.config.userActionTracking) return;

    const event = MonitoringEventFactory.createUserAction(actionType, target, properties, context);
    await this.processEvent(event);
  }

  /**
   * Capture a system event
   */
  async captureSystem(
    component: string,
    status: 'healthy' | 'degraded' | 'failed',
    message: string,
    metrics?: Record<string, number>,
    context?: Partial<MonitoringContext>
  ): Promise<void> {
    if (!this.shouldCapture()) return;

    const event = MonitoringEventFactory.createSystem(component, status, message, metrics, context);
    await this.processEvent(event);
  }

  /**
   * Capture a business event
   */
  async captureBusiness(
    event: string,
    properties: Record<string, unknown>,
    message?: string,
    value?: number,
    currency?: string,
    context?: Partial<MonitoringContext>
  ): Promise<void> {
    if (!this.shouldCapture()) return;

    const businessEvent = MonitoringEventFactory.createBusiness(event, properties, message, value, currency, context);
    await this.processEvent(businessEvent);
  }

  /**
   * Capture a security event
   */
  async captureSecurity(
    type: 'authentication' | 'authorization' | 'data_access' | 'vulnerability',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    source?: string,
    target?: string,
    context?: Partial<MonitoringContext>
  ): Promise<void> {
    if (!this.shouldCapture()) return;

    const securityEvent = MonitoringEventFactory.createSecurity(type, severity, message, source, target, context);
    await this.processEvent(securityEvent);
  }

  /**
   * Capture a generic event
   */
  async captureEvent(event: AnyMonitoringEvent): Promise<void> {
    if (!this.shouldCapture()) return;
    await this.processEvent(event as any);
  }

  /**
   * Add a breadcrumb
   */
  async addBreadcrumb(
    message: string,
    category?: string,
    level?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const breadcrumb: MonitoringBreadcrumb = {
      id: this.generateId(),
      timestamp: Date.now(),
      message,
      category,
      level: level as any,
      data,
    };

    this.breadcrumbs.push(breadcrumb);
    
    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }

    // Send to adapter
    await this.adapter.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  async setUser(userId: string, attributes?: Record<string, unknown>): Promise<void> {
    this.context.userId = this.hashUserId(userId);
    await this.adapter.setUser(this.context.userId, attributes);
  }

  /**
   * Set a tag
   */
  async setTag(key: string, value: string): Promise<void> {
    await this.adapter.setTag(key, value);
  }

  /**
   * Set context
   */
  async setContext(key: string, value: Record<string, unknown>): Promise<void> {
    await this.adapter.setContext(key, value);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * Export monitoring data
   */
  async exportData(options: MonitoringExportOptions): Promise<string> {
    const events = this.filterEvents(options.filter);
    
    const exportData = {
      timestamp: Date.now(),
      service: {
        name: this.config.serviceName,
        version: this.config.serviceVersion,
      },
      context: this.context,
      stats: this.stats,
      events: options.includeContext ? events : events.map(this.stripContext),
      breadcrumbs: options.includeBreadcrumbs ? this.breadcrumbs : [],
      format: options.format,
    };

    return this.formatExportData(exportData, options.format);
  }

  /**
   * Clear all monitoring data
   */
  async clearData(): Promise<void> {
    this.queue = [];
    this.breadcrumbs = [];
    this.stats = {
      totalEvents: 0,
      eventsByCategory: {} as any,
      eventsBySeverity: {} as any,
      queueSize: 0,
      lastEventTimestamp: 0,
      adapterStatus: this.stats.adapterStatus,
    };
  }

  /**
   * Cleanup monitoring service
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    // Flush remaining events
    await this.flushQueue();

    // Cleanup adapter
    await this.adapter.cleanup();

    this.initialized = false;
    console.log('Monitoring service cleaned up');
  }

  /**
   * Process an event through the pipeline
   */
  private async processEvent(event: AnyMonitoringEvent): Promise<void> {
    try {
      // Apply context enrichers
      event.context = await this.enrichContext(event.context || {});

      // Apply redaction rules
      event = this.redactSensitiveData(event);

      // Add to queue
      this.addToQueue(event);

      // Update stats
      this.updateStats(event);

      // Send immediately if not using offline queue
      if (!this.config.enableOfflineQueue) {
        await this.sendEvent(event);
      }
    } catch (error) {
      console.error('Failed to process monitoring event:', error);
    }
  }

  /**
   * Check if event should be captured based on sampling rate
   */
  private shouldCapture(): boolean {
    return this.initialized && Math.random() <= this.config.samplingRate;
  }

  /**
   * Add event to queue
   */
  private addToQueue(event: AnyMonitoringEvent): void {
    this.queue.push(event as any);
    
    // Limit queue size
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue.shift();
    }
    
    this.stats.queueSize = this.queue.length;
  }

  /**
   * Send event to adapter
   */
  private async sendEvent(event: AnyMonitoringEvent): Promise<void> {
    try {
      switch (event.category) {
        case 'error':
          await this.adapter.captureError(event as ErrorEvent);
          break;
        case 'performance':
          await this.adapter.captureEvent(event);
          break;
        case 'user_action':
          await this.adapter.captureEvent(event);
          break;
        default:
          await this.adapter.captureMessage(event);
      }
    } catch (error) {
      console.error('Failed to send event to adapter:', error);
      this.stats.adapterStatus = 'error';
    }
  }

  /**
   * Flush event queue
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.stats.queueSize = 0;

    for (const event of events) {
      await this.sendEvent(event as any);
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.config.queueFlushInterval);
  }

  /**
   * Start session tracking
   */
  private startSessionTracking(): void {
    this.sessionTimer = setInterval(() => {
      const sessionDuration = Date.now() - this.sessionStartTime;
      
      if (sessionDuration > this.config.sessionTimeout) {
        // Session expired, create new session
        this.sessionStartTime = Date.now();
        this.context.sessionId = this.generateSessionId();
        
        this.addBreadcrumb('New session started', 'session', 'info', {
          sessionId: this.context.sessionId,
          previousSessionDuration: sessionDuration,
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Create base monitoring context
   */
  private createBaseContext(): MonitoringContext {
    return {
      appVersion: this.config.serviceVersion,
      environment: process.env.NODE_ENV || 'development',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      fingerprint: this.generateFingerprint(),
      sessionId: this.generateSessionId(),
    };
  }

  /**
   * Enrich context with additional data
   */
  private async enrichContext(baseContext: Partial<MonitoringContext>): Promise<MonitoringContext> {
    let enriched = { ...this.context, ...baseContext };

    for (const enricher of this.config.contextEnrichers) {
      try {
        const enrichment = await enricher.enrich(enriched);
        enriched = { ...enriched, ...enrichment };
      } catch (error) {
        console.error(`Context enricher ${enricher.name} failed:`, error);
      }
    }

    return enriched;
  }

  /**
   * Redact sensitive data from events
   */
  private redactSensitiveData(event: AnyMonitoringEvent): AnyMonitoringEvent {
    const redacted = { ...event };

    for (const rule of this.config.redactionRules) {
      try {
        this.applyRedactionRule(redacted, rule);
      } catch (error) {
        console.error(`Redaction rule ${rule.name} failed:`, error);
      }
    }

    return redacted;
  }

  /**
   * Apply a single redaction rule
   */
  private applyRedactionRule(obj: any, rule: RedactionRule): void {
    for (const field of rule.fields) {
      const value = this.getNestedValue(obj, field);
      if (value && typeof value === 'string') {
        if (rule.pattern.test(value)) {
          this.setNestedValue(obj, field, rule.replacement);
        }
      }
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested object value by path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    
    if (target) {
      target[lastKey] = value;
    }
  }

  /**
   * Filter events based on criteria
   */
  private filterEvents(filter?: MonitoringFilter): MonitoringEvent[] {
    if (!filter) {
      return this.events;
    }

    return this.events.filter((event: MonitoringEvent) => {
      // Filter by categories
      if (filter.categories && !filter.categories.includes(event.category)) {
        return false;
      }

      // Filter by severities
      if (filter.severities && !filter.severities.includes(event.severity)) {
        return false;
      }

      // Filter by time range
      if (filter.timeRange) {
        if (filter.timeRange.start && event.timestamp < filter.timeRange.start) {
          return false;
        }
        if (filter.timeRange.end && event.timestamp > filter.timeRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Update monitoring statistics
   */
  private updateStats(event: AnyMonitoringEvent): void {
    this.stats.totalEvents++;
    this.stats.lastEventTimestamp = event.timestamp;
    
    this.stats.eventsByCategory[event.category] = 
      (this.stats.eventsByCategory[event.category] || 0) + 1;
    
    this.stats.eventsBySeverity[event.severity] = 
      (this.stats.eventsBySeverity[event.severity] || 0) + 1;
  }

  /**
   * Get breadcrumbs
   */
  getBreadcrumbs(): MonitoringBreadcrumb[] {
    return this.breadcrumbs;
  }

  /**
   * Strip context from events
   */
  private stripContext = (event: MonitoringEvent): MonitoringEvent => {
    const { context, ...eventWithoutContext } = event;
    return eventWithoutContext;
  };

  /**
   * Format export data based on format
   */
  private formatExportData(data: any, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const headers = ['timestamp', 'category', 'severity', 'message'];
    const rows = data.events.map((event: any) => [
      event.timestamp,
      event.category,
      event.severity,
      event.message,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    // Simplified XML conversion
    return `<?xml version="1.0" encoding="UTF-8"?>
<monitoring>
  <timestamp>${data.timestamp}</timestamp>
  <service>${data.service.name}</service>
  <events>
    ${data.events.map((event: any) => `
    <event>
      <timestamp>${event.timestamp}</timestamp>
      <category>${event.category}</category>
      <severity>${event.severity}</severity>
      <message>${event.message}</message>
    </event>`).join('')}
  </events>
</monitoring>`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${this.generateId()}`;
  }

  /**
   * Generate device fingerprint
   */
  private generateFingerprint(): string {
    if (typeof window === 'undefined') {
      return 'server';
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    return btoa(fingerprint).substr(0, 16);
  }

  /**
   * Hash user ID for privacy
   */
  private hashUserId(userId: string): string {
    // Simple hash for demonstration - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 10): MonitoringEvent[] {
    return this.events
      .slice()
      .sort((a: MonitoringEvent, b: MonitoringEvent) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Track an event (alias for captureEvent for compatibility)
   */
  async trackEvent(event: Partial<MonitoringEvent>): Promise<{ success: boolean; error?: string }> {
    try {
      const fullEvent: MonitoringEvent = {
        id: this.generateId(),
        timestamp: Date.now(),
        severity: event.severity || MonitoringSeverity.INFO,
        category: event.category || MonitoringCategory.SYSTEM,
        message: event.message || 'Unknown event',
        data: event.data,
        tags: event.tags,
        context: event.context,
      };
      
      await this.captureEvent(fullEvent as any);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Purge user data for DSR compliance
   */
  async purgeUserData(userId?: string): Promise<{ purgedEvents: number }> {
    const targetUserId = userId || this.context.userId;
    if (!targetUserId) {
      return { purgedEvents: 0 };
    }

    let purgedCount = 0;
    
    // Purge from events
    const initialEventCount = this.events.length;
    this.events = this.events.filter((event: MonitoringEvent) => 
      !event.context?.userId || event.context.userId !== targetUserId
    );
    purgedCount += initialEventCount - this.events.length;

    // Purge from queue
    const initialQueueCount = this.queue.length;
    this.queue = this.queue.filter((event: MonitoringEvent) => 
      !event.context?.userId || event.context.userId !== targetUserId
    );
    purgedCount += initialQueueCount - this.queue.length;

    // Clear user context if matching
    if (this.context.userId === targetUserId) {
      this.context.userId = '';
      this.context.userAttributes = {};
    }

    return { purgedEvents: purgedCount };
  }

  /**
   * Get user events for DSR export
   */
  async getUserEvents(userId?: string): Promise<MonitoringEvent[]> {
    const targetUserId = userId || this.context.userId;
    if (!targetUserId) {
      return [];
    }

    return this.events.filter((event: MonitoringEvent) => 
      event.context?.userId === targetUserId
    );
  }
}
