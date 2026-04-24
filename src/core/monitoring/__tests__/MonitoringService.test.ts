/**
 * Unit tests for Monitoring Service
 * Tests unified telemetry, adapters, and data processing
 * 
 * @fileoverview Monitoring service tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MonitoringService, MonitoringServiceConfig } from '../MonitoringService';
import { MonitoringAdapter, MonitoringEvent, ErrorEvent, PerformanceEvent } from '../types';
import { MonitoringEventFactory } from '../types';

// Mock adapter for testing
class MockAdapter implements MonitoringAdapter {
  readonly name = 'mock';
  private events: any[] = [];
  private breadcrumbs: any[] = [];
  private user: any = null;
  private tags: Record<string, string> = {};
  private contexts: Record<string, any> = {};

  async initialize(): Promise<void> {
    // Mock implementation
  }

  async captureError(event: ErrorEvent): Promise<void> {
    this.events.push({ type: 'error', ...event });
  }

  async captureMessage(event: MonitoringEvent): Promise<void> {
    this.events.push({ type: 'message', ...event });
  }

  async captureEvent(event: MonitoringEvent): Promise<void> {
    this.events.push({ type: 'event', ...event });
  }

  async setUser(userId: string, attributes?: Record<string, unknown>): Promise<void> {
    this.user = { id: userId, ...attributes };
  }

  async addBreadcrumb(breadcrumb: any): Promise<void> {
    this.breadcrumbs.push(breadcrumb);
  }

  async setTag(key: string, value: string): Promise<void> {
    this.tags[key] = value;
  }

  async setContext(key: string, value: Record<string, unknown>): Promise<void> {
    this.contexts[key] = value;
  }

  async cleanup(): Promise<void> {
    this.events = [];
    this.breadcrumbs = [];
    this.user = null;
    this.tags = {};
    this.contexts = {};
  }

  // Test helpers
  getEvents() {
    return [...this.events];
  }

  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  getUser() {
    return this.user;
  }

  getTags() {
    return { ...this.tags };
  }

  getContexts() {
    return { ...this.contexts };
  }
}

describe('MonitoringService', () => {
  let service: MonitoringService;
  let mockAdapter: MockAdapter;
  let config: MonitoringServiceConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAdapter = new MockAdapter();
    config = {
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enabled: true,
      adapter: mockAdapter,
      samplingRate: 1.0,
      debug: false,
      autoErrorReporting: true,
      performanceMonitoring: true,
      userActionTracking: true,
      redactionRules: [],
      offlineQueue: {
        enabled: false,
        maxSize: 100,
        flushInterval: 5000,
      },
      contextEnrichers: [],
      enableOfflineQueue: false,
      maxQueueSize: 100,
      queueFlushInterval: 5000,
      enableSessionTracking: true,
      sessionTimeout: 1800000, // 30 minutes
    };

    service = new MonitoringService(config);
  });

  afterEach(() => {
    service.cleanup();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await service.initialize();
      expect(mockAdapter.getEvents().length).toBeGreaterThan(0);
    });

    test('should not initialize when disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledService = new MonitoringService(disabledConfig);
      
      await disabledService.initialize();
      expect(mockAdapter.getEvents().length).toBe(0);
    });

    test('should handle initialization errors', async () => {
      mockAdapter.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      await expect(service.initialize()).rejects.toThrow('Init failed');
    });

    test('should not initialize twice', async () => {
      await service.initialize();
      const consoleSpy = jest.spyOn(console, 'warn');
      
      await service.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('Monitoring service already initialized');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Capture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture errors', async () => {
      const error = new Error('Test error');
      await service.captureError(error);
      
      const events = mockAdapter.getEvents();
      expect(events.length).toBe(2); // System event + error event
      expect(events[1].type).toBe('error');
      expect(events[1].error.message).toBe('Test error');
    });

    test('should capture errors with context', async () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent' };
      
      await service.captureError(error, context);
      
      const events = mockAdapter.getEvents();
      expect(events[1].context).toEqual(expect.objectContaining(context));
    });

    test('should capture errors with error info', async () => {
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'at TestComponent' };
      
      await service.captureError(error, {}, errorInfo);
      
      const events = mockAdapter.getEvents();
      expect(events[1].errorInfo).toEqual(errorInfo);
    });
  });

  describe('Performance Capture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture performance metrics', async () => {
      await service.capturePerformance('load-time', 1500, 'ms', 1000);
      
      const events = mockAdapter.getEvents();
      expect(events[1].type).toBe('event');
      expect(events[1].metric.name).toBe('load-time');
      expect(events[1].metric.value).toBe(1500);
      expect(events[1].metric.budget).toBe(1000);
      expect(events[1].metric.breached).toBe(true);
    });

    test('should capture performance without budget', async () => {
      await service.capturePerformance('response-time', 200, 'ms');
      
      const events = mockAdapter.getEvents();
      expect(events[1].metric.budget).toBeUndefined();
      expect(events[1].metric.breached).toBeUndefined();
    });
  });

  describe('User Action Capture', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture user actions', async () => {
      await service.captureUserAction('click', 'submit-button', { form: 'login' });
      
      const events = mockAdapter.getEvents();
      expect(events[1].type).toBe('event');
      expect(events[1].action.type).toBe('click');
      expect(events[1].action.target).toBe('submit-button');
      expect(events[1].action.properties).toEqual({ form: 'login' });
    });

    test('should skip user actions when tracking disabled', async () => {
      const noTrackingConfig = { ...config, userActionTracking: false };
      const noTrackingService = new MonitoringService(noTrackingConfig);
      await noTrackingService.initialize();
      
      await noTrackingService.captureUserAction('click', 'button');
      
      const events = mockAdapter.getEvents();
      expect(events.length).toBe(1); // Only system event
      
      noTrackingService.cleanup();
    });
  });

  describe('System Events', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture system events', async () => {
      await service.captureSystem('database', 'healthy', 'Database connection OK');
      
      const events = mockAdapter.getEvents();
      expect(events[1].type).toBe('event');
      expect(events[1].system.component).toBe('database');
      expect(events[1].system.status).toBe('healthy');
    });

    test('should capture system events with metrics', async () => {
      const metrics = { connections: 10, queryTime: 50 };
      await service.captureSystem('database', 'degraded', 'Slow queries', metrics);
      
      const events = mockAdapter.getEvents();
      expect(events[1].system.metrics).toEqual(metrics);
    });
  });

  describe('Business Events', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture business events', async () => {
      await service.captureBusiness('purchase', { productId: '123', amount: 99.99 }, 'Product purchased', 99.99, 'USD');
      
      const events = mockAdapter.getEvents();
      expect(events[1].type).toBe('event');
      expect(events[1].business.event).toBe('purchase');
      expect(events[1].business.properties).toEqual({ productId: '123', amount: 99.99 });
      expect(events[1].business.value).toBe(99.99);
      expect(events[1].business.currency).toBe('USD');
    });
  });

  describe('Security Events', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should capture security events', async () => {
      await service.captureSecurity('authentication', 'high', 'Failed login attempt', 'login-form', 'user-123');
      
      const events = mockAdapter.getEvents();
      expect(events[1].type).toBe('event');
      expect(events[1].security.type).toBe('authentication');
      expect(events[1].security.severity).toBe('high');
      expect(events[1].security.source).toBe('login-form');
      expect(events[1].security.target).toBe('user-123');
    });
  });

  describe('Breadcrumbs', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should add breadcrumbs', async () => {
      await service.addBreadcrumb('User navigated to dashboard', 'navigation');
      
      const breadcrumbs = mockAdapter.getBreadcrumbs();
      expect(breadcrumbs.length).toBe(1);
      expect(breadcrumbs[0].message).toBe('User navigated to dashboard');
      expect(breadcrumbs[0].category).toBe('navigation');
    });

    test('should limit breadcrumb history', async () => {
      // Add more than 100 breadcrumbs
      for (let i = 0; i < 150; i++) {
        await service.addBreadcrumb(`Breadcrumb ${i}`);
      }
      
      const breadcrumbs = mockAdapter.getBreadcrumbs();
      expect(breadcrumbs.length).toBe(100);
      expect(breadcrumbs[0].message).toBe('Breadcrumb 149'); // Should keep latest
    });
  });

  describe('User Context', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should set user context', async () => {
      await service.setUser('user-123', { email: 'test@example.com', plan: 'premium' });
      
      const user = mockAdapter.getUser();
      expect(user.id).toBe('user-123'); // Should be hashed
      expect(user.email).toBe('test@example.com');
      expect(user.plan).toBe('premium');
    });

    test('should hash user ID for privacy', async () => {
      await service.setUser('user-123');
      
      const user = mockAdapter.getUser();
      expect(user.id).not.toBe('user-123'); // Should be hashed
      expect(user.id).toMatch(/^user_/); // Should have prefix
    });
  });

  describe('Tags and Context', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should set tags', async () => {
      await service.setTag('environment', 'production');
      await service.setTag('version', '1.0.0');
      
      const tags = mockAdapter.getTags();
      expect(tags.environment).toBe('production');
      expect(tags.version).toBe('1.0.0');
    });

    test('should set context', async () => {
      await service.setContext('browser', { name: 'Chrome', version: '91.0' });
      await service.setContext('device', { type: 'mobile', os: 'iOS' });
      
      const contexts = mockAdapter.getContexts();
      expect(contexts.browser).toEqual({ name: 'Chrome', version: '91.0' });
      expect(contexts.device).toEqual({ type: 'mobile', os: 'iOS' });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should calculate statistics correctly', async () => {
      await service.captureError(new Error('Test error'));
      await service.capturePerformance('load-time', 1000, 'ms');
      await service.captureUserAction('click', 'button');
      
      const stats = service.getStats();
      expect(stats.totalEvents).toBe(4); // System + error + performance + user action
      expect(stats.eventsByCategory.error).toBe(1);
      expect(stats.eventsByCategory.performance).toBe(1);
      expect(stats.eventsByCategory.user_action).toBe(1);
      expect(stats.eventsByCategory.system).toBe(1);
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should export data in JSON format', async () => {
      await service.captureError(new Error('Test error'));
      
      const exportData = await service.exportData({ format: 'json' });
      const parsed = JSON.parse(exportData);
      
      expect(parsed.service.name).toBe('test-service');
      expect(parsed.service.version).toBe('1.0.0');
      expect(parsed.events).toBeDefined();
      expect(parsed.stats).toBeDefined();
    });

    test('should export data in CSV format', async () => {
      await service.captureError(new Error('Test error'));
      
      const exportData = await service.exportData({ format: 'csv' });
      
      expect(exportData).toContain('timestamp,category,severity,message');
      expect(exportData).toContain('Test error');
    });

    test('should export data in XML format', async () => {
      await service.captureError(new Error('Test error'));
      
      const exportData = await service.exportData({ format: 'xml' });
      
      expect(exportData).toContain('<?xml version="1.0"');
      expect(exportData).toContain('<monitoring>');
      expect(exportData).toContain('<service>test-service</service>');
    });

    test('should filter exported data', async () => {
      await service.captureError(new Error('Test error'));
      await service.capturePerformance('load-time', 1000, 'ms');
      
      const exportData = await service.exportData({
        format: 'json',
        filter: {
          categories: ['error'],
        },
      });
      
      const parsed = JSON.parse(exportData);
      expect(parsed.events.length).toBe(1);
      expect(parsed.events[0].category).toBe('error');
    });
  });

  describe('Data Redaction', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should redact sensitive data', async () => {
      const redactionConfig = {
        ...config,
        redactionRules: [
          {
            name: 'email-redaction',
            pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            replacement: '[REDACTED_EMAIL]',
            fields: ['message', 'data.email'],
          },
        ],
      };
      
      const redactionService = new MonitoringService(redactionConfig);
      await redactionService.initialize();
      
      await redactionService.captureError(new Error('User email: test@example.com failed'));
      
      const events = mockAdapter.getEvents();
      expect(events[1].message).toBe('User email: [REDACTED_EMAIL] failed');
      
      redactionService.cleanup();
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should enrich context with enrichers', async () => {
      const enricher = {
        name: 'device-enricher',
        enrich: async (context: any) => ({
          deviceType: 'mobile',
          screenSize: '375x667',
        }),
      };
      
      const enrichedConfig = {
        ...config,
        contextEnrichers: [enricher],
      };
      
      const enrichedService = new MonitoringService(enrichedConfig);
      await enrichedService.initialize();
      
      await enrichedService.captureError(new Error('Test error'));
      
      const events = mockAdapter.getEvents();
      expect(events[1].context.deviceType).toBe('mobile');
      expect(events[1].context.screenSize).toBe('375x667');
      
      enrichedService.cleanup();
    });

    test('should handle enricher failures gracefully', async () => {
      const faultyEnricher = {
        name: 'faulty-enricher',
        enrich: async () => {
          throw new Error('Enricher failed');
        },
      };
      
      const faultyConfig = {
        ...config,
        contextEnrichers: [faultyEnricher],
      };
      
      const faultyService = new MonitoringService(faultyConfig);
      await faultyService.initialize();
      
      // Should not throw
      await expect(faultyService.captureError(new Error('Test error'))).resolves.not.toThrow();
      
      faultyService.cleanup();
    });
  });

  describe('Session Tracking', () => {
    test('should track session duration', async () => {
      const sessionConfig = {
        ...config,
        enableSessionTracking: true,
        sessionTimeout: 60000, // 1 minute for testing
      };
      
      const sessionService = new MonitoringService(sessionConfig);
      await sessionService.initialize();
      
      // Advance time beyond session timeout
      jest.advanceTimersByTime(70000);
      
      await sessionService.captureError(new Error('Test error'));
      
      const events = mockAdapter.getEvents();
      expect(events[1].context.sessionId).toBeDefined();
      
      sessionService.cleanup();
    });
  });

  describe('Offline Queue', () => {
    test('should queue events when offline queue enabled', async () => {
      const queueConfig = {
        ...config,
        enableOfflineQueue: true,
        maxQueueSize: 5,
      };
      
      const queueService = new MonitoringService(queueConfig);
      await queueService.initialize();
      
      // Add more events than queue size
      for (let i = 0; i < 10; i++) {
        await queueService.captureError(new Error(`Error ${i}`));
      }
      
      const stats = queueService.getStats();
      expect(stats.queueSize).toBe(5); // Should be limited to max size
      
      queueService.cleanup();
    });
  });

  describe('Sampling', () => {
    test('should respect sampling rate', async () => {
      const samplingConfig = {
        ...config,
        samplingRate: 0.0, // Never sample
      };
      
      const samplingService = new MonitoringService(samplingConfig);
      await samplingService.initialize();
      
      await samplingService.captureError(new Error('Test error'));
      
      const events = mockAdapter.getEvents();
      expect(events.length).toBe(1); // Only system event
      
      samplingService.cleanup();
    });

    test('should capture events when sampling rate allows', async () => {
      const samplingConfig = {
        ...config,
        samplingRate: 1.0, // Always sample
      };
      
      const samplingService = new MonitoringService(samplingConfig);
      await samplingService.initialize();
      
      await samplingService.captureError(new Error('Test error'));
      
      const events = mockAdapter.getEvents();
      expect(events.length).toBe(2); // System + error
      
      samplingService.cleanup();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      await service.initialize();
      await service.captureError(new Error('Test error'));
      
      expect(mockAdapter.getEvents().length).toBeGreaterThan(0);
      
      await service.cleanup();
      
      // Should clear adapter data
      expect(mockAdapter.getEvents().length).toBe(0);
    });
  });
});
