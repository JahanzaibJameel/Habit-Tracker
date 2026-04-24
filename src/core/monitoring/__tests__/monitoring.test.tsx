/**
 * Comprehensive unit tests for monitoring system
 * Tests monitoring service, adapters, offline queue, provider, and redaction
 * 
 * @fileoverview Monitoring system tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import monitoring components
import { MonitoringService } from '../MonitoringService';
import { OfflineQueue, createOfflineQueue } from '../OfflineQueue';
import { MonitoringProvider, useMonitoring, withMonitoring } from '../MonitoringProvider';
import { DataRedactor, redactSensitiveData, DEFAULT_REDACTION_RULES } from '../DataRedaction';
import { MonitoringEvent, MonitoringSeverity, MonitoringCategory } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService({
      serviceName: 'test-service',
      environment: 'test',
    });
  });

  test('should initialize with default configuration', () => {
    expect(monitoringService).toBeDefined();
    expect(monitoringService.isEnabled()).toBe(true);
  });

  test('should track events successfully', async () => {
    const event: MonitoringEvent = {
      id: 'test-event-1',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Test event',
    };

    const result = await monitoringService.trackEvent(event);
    expect(result.success).toBe(true);
    expect(result.eventId).toBe(event.id);
  });

  test('should handle disabled service', async () => {
    monitoringService.setEnabled(false);
    
    const event: MonitoringEvent = {
      id: 'test-event-2',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Test event',
    };

    const result = await monitoringService.trackEvent(event);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('disabled');
  });

  test('should batch track events', async () => {
    const events: MonitoringEvent[] = [
      {
        id: 'batch-1',
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: 'Batch event 1',
      },
      {
        id: 'batch-2',
        timestamp: Date.now(),
        severity: MonitoringSeverity.WARNING,
        category: MonitoringCategory.PERFORMANCE,
        message: 'Batch event 2',
      },
    ];

    const results = await monitoringService.trackEvents(events);
    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });

  test('should provide service statistics', () => {
    const stats = monitoringService.getStats();
    expect(stats).toHaveProperty('totalEvents');
    expect(stats).toHaveProperty('successfulEvents');
    expect(stats).toHaveProperty('failedEvents');
    expect(stats).toHaveProperty('enabled');
    expect(stats).toHaveProperty('uptime');
  });

  test('should handle service errors gracefully', async () => {
    const invalidEvent = {
      id: '',
      timestamp: Date.now(),
      severity: 'invalid' as any,
      category: MonitoringCategory.SYSTEM,
      message: '',
    };

    const result = await monitoringService.trackEvent(invalidEvent);
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = createOfflineQueue({
      maxMemoryEvents: 10,
      maxStorageSize: 1024 * 1024, // 1MB
    });
  });

  test('should add events to queue', () => {
    const event: MonitoringEvent = {
      id: 'queue-test-1',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Queue test event',
    };

    const result = queue.addEvent(event);
    expect(result).toBe(true);
    
    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.memoryEvents).toBe(1);
  });

  test('should reject invalid events', () => {
    const invalidEvent = {
      id: '',
      timestamp: Date.now(),
      severity: 'invalid' as any,
      category: MonitoringCategory.SYSTEM,
      message: '',
    };

    const result = queue.addEvent(invalidEvent);
    expect(result).toBe(false);
  });

  test('should add multiple events', () => {
    const events: MonitoringEvent[] = [
      {
        id: 'multi-1',
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: 'Multi event 1',
      },
      {
        id: 'multi-2',
        timestamp: Date.now(),
        severity: MonitoringSeverity.WARNING,
        category: MonitoringCategory.PERFORMANCE,
        message: 'Multi event 2',
      },
    ];

    const added = queue.addEvents(events);
    expect(added).toBe(2);
    
    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(2);
  });

  test('should flush events with processor', async () => {
    const event: MonitoringEvent = {
      id: 'flush-test-1',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Flush test event',
    };

    queue.addEvent(event);
    
    const mockProcessor = jest.fn().mockResolvedValue({
      success: true,
      processed: 1,
      failed: 0,
      remaining: 0,
    });

    queue.addProcessor(mockProcessor);
    
    const result = await queue.flush();
    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(mockProcessor).toHaveBeenCalled();
  });

  test('should handle flush when already processing', async () => {
    const event: MonitoringEvent = {
      id: 'processing-test-1',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Processing test event',
    };

    queue.addEvent(event);
    
    const mockProcessor = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        processed: 1,
        failed: 0,
        remaining: 0,
      }), 100))
    );

    queue.addProcessor(mockProcessor);
    
    // Start first flush
    const flush1 = queue.flush();
    
    // Second flush should fail
    const flush2 = await queue.flush();
    expect(flush2.success).toBe(false);
    expect(flush2.error).toContain('already processing');
    
    await flush1;
  });

  test('should filter events by severity', () => {
    const events: MonitoringEvent[] = [
      {
        id: 'severity-1',
        timestamp: Date.now(),
        severity: MonitoringSeverity.ERROR,
        category: MonitoringCategory.SYSTEM,
        message: 'Error event',
      },
      {
        id: 'severity-2',
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: 'Info event',
      },
    ];

    queue.addEvents(events);
    
    const errorEvents = queue.getEventsBySeverity(MonitoringSeverity.ERROR);
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].id).toBe('severity-1');
    
    const infoEvents = queue.getEventsBySeverity(MonitoringSeverity.INFO);
    expect(infoEvents).toHaveLength(1);
    expect(infoEvents[0].id).toBe('severity-2');
  });

  test('should clear old events', () => {
    const oldEvent: MonitoringEvent = {
      id: 'old-event',
      timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Old event',
    };

    const recentEvent: MonitoringEvent = {
      id: 'recent-event',
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: MonitoringCategory.SYSTEM,
      message: 'Recent event',
    };

    queue.addEvents([oldEvent, recentEvent]);
    
    const cleared = queue.clearOldEvents(24 * 60 * 60 * 1000); // 1 day
    expect(cleared).toBe(1);
    
    const remainingEvents = queue.getAllEvents();
    expect(remainingEvents).toHaveLength(1);
    expect(remainingEvents[0].id).toBe('recent-event');
  });

  test('should export and import events', () => {
    const events: MonitoringEvent[] = [
      {
        id: 'export-1',
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: 'Export event 1',
      },
      {
        id: 'export-2',
        timestamp: Date.now(),
        severity: MonitoringSeverity.WARNING,
        category: MonitoringCategory.PERFORMANCE,
        message: 'Export event 2',
      },
    ];

    queue.addEvents(events);
    
    const exported = queue.exportEvents();
    expect(exported).toContain('export-1');
    expect(exported).toContain('export-2');
    
    // Clear and import
    queue.clear();
    const imported = queue.importEvents(exported);
    expect(imported).toBe(2);
    
    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(2);
  });
});

describe('DataRedaction', () => {
  let redactor: DataRedactor;

  beforeEach(() => {
    redactor = new DataRedactor({
      enabled: true,
      rules: DEFAULT_REDACTION_RULES,
      sensitiveFields: ['password', 'token', 'email'],
    });
  });

  test('should redact email addresses', () => {
    const data = {
      user: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
      },
    };

    const result = redactor.redact(data);
    expect(result.modified).toBe(true);
    expect(result.redactionCount).toBeGreaterThan(0);
    
    const redactedData = result.data as any;
    expect(redactedData.user.email).toBe('[REDACTED_EMAIL]');
    expect(redactedData.user.phone).toBe('[REDACTED_PHONE]');
  });

  test('should redact sensitive fields completely', () => {
    const data = {
      credentials: {
        username: 'john.doe',
        password: 'secret123',
        token: 'abc123def456',
      },
    };

    const result = redactor.redact(data);
    const redactedData = result.data as any;
    
    expect(redactedData.credentials.password).toBe('[REDACTED]');
    expect(redactedData.credentials.token).toBe('[REDACTED]');
    expect(redactedData.credentials.username).toBe('john.doe'); // Not redacted
  });

  test('should handle nested objects', () => {
    const data = {
      level1: {
        level2: {
          email: 'nested@example.com',
          api_key: 'secret-api-key-12345',
        },
      },
    };

    const result = redactor.redact(data);
    const redactedData = result.data as any;
    
    expect(redactedData.level1.level2.email).toBe('[REDACTED_EMAIL]');
    expect(redactedData.level1.level2.api_key).toBe('[REDACTED_TOKEN]');
  });

  test('should handle arrays', () => {
    const data = {
      users: [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
      ],
    };

    const result = redactor.redact(data);
    const redactedData = result.data as any;
    
    expect(redactedData.users[0].email).toBe('[REDACTED_EMAIL]');
    expect(redactedData.users[1].email).toBe('[REDACTED_EMAIL]');
    expect(redactedData.users[0].name).toBe('User 1');
    expect(redactedData.users[1].name).toBe('User 2');
  });

  test('should truncate long strings', () => {
    const longString = 'x'.repeat(2000);
    const data = { longString };

    const result = redactor.redact(data);
    const redactedData = result.data as any;
    
    expect(redactedData.longString.length).toBeLessThanOrEqual(1003); // 1000 + '...'
    expect(redactedData.longString.endsWith('...')).toBe(true);
  });

  test('should be disabled when configured', () => {
    const disabledRedactor = new DataRedactor({ enabled: false });
    const data = { email: 'test@example.com' };

    const result = disabledRedactor.redact(data);
    expect(result.modified).toBe(false);
    expect(result.data).toEqual(data);
  });

  test('should add custom rules', () => {
    const customRule = {
      pattern: /CUSTOM_\w+/g,
      replacement: '[REDACTED_CUSTOM]',
      description: 'Custom pattern',
    };

    redactor.addRule(customRule);
    
    const data = { customField: 'CUSTOM_SECRET_VALUE' };
    const result = redactor.redact(data);
    const redactedData = result.data as any;
    
    expect(redactedData.customField).toBe('[REDACTED_CUSTOM]');
  });

  test('should identify sensitive fields', () => {
    expect(redactor.isSensitiveField('password')).toBe(true);
    expect(redactor.isSensitiveField('userPassword')).toBe(true);
    expect(redactor.isSensitiveField('PASSWORD')).toBe(true);
    expect(redactor.isSensitiveField('name')).toBe(false);
  });
});

describe('MonitoringProvider', () => {
  let monitoringService: MonitoringService;
  let offlineQueue: OfflineQueue;

  beforeEach(() => {
    monitoringService = new MonitoringService({
      serviceName: 'test-service',
      environment: 'test',
    });
    
    offlineQueue = createOfflineQueue({
      maxMemoryEvents: 10,
    });
  });

  test('should provide monitoring context', () => {
    const TestComponent = () => {
      const { service, trackEvent, trackError } = useMonitoring();
      
      const handleTrackEvent = () => {
        trackEvent({
          message: 'Test event',
          category: MonitoringCategory.SYSTEM,
        });
      };

      const handleTrackError = () => {
        trackError(new Error('Test error'));
      };

      return (
        <div>
          <span data-testid="service-name">{service.getServiceName()}</span>
          <button onClick={handleTrackEvent}>Track Event</button>
          <button onClick={handleTrackError}>Track Error</button>
        </div>
      );
    };

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
        trackErrors={true}
      >
        <TestComponent />
      </MonitoringProvider>
    );

    expect(screen.getByTestId('service-name')).toHaveTextContent('test-service');
    expect(screen.getByText('Track Event')).toBeInTheDocument();
    expect(screen.getByText('Track Error')).toBeInTheDocument();
  });

  test('should track events through context', async () => {
    const TestComponent = () => {
      const { trackEvent } = useMonitoring();
      
      React.useEffect(() => {
        trackEvent({
          message: 'Context test event',
          category: MonitoringCategory.USER_ACTION,
        });
      }, [trackEvent]);

      return <div>Test Component</div>;
    };

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
      >
        <TestComponent />
      </MonitoringProvider>
    );

    await waitFor(() => {
      const stats = monitoringService.getStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
    });
  });

  test('should catch and track errors', async () => {
    const ErrorComponent = () => {
      throw new Error('Test error from component');
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
        trackErrors={true}
      >
        <ErrorComponent />
      </MonitoringProvider>
    );

    await waitFor(() => {
      const stats = monitoringService.getStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
    });

    consoleSpy.mockRestore();
  });

  test('should respect sampling rate', () => {
    const TestComponent = () => {
      const { trackEvent } = useMonitoring();
      
      React.useEffect(() => {
        // Track multiple events
        for (let i = 0; i < 100; i++) {
          trackEvent({
            message: `Sample event ${i}`,
            category: MonitoringCategory.SYSTEM,
          });
        }
      }, [trackEvent]);

      return <div>Test Component</div>;
    };

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
        samplingRate={0.1} // 10% sampling
      >
        <TestComponent />
      </MonitoringProvider>
    );

    const stats = monitoringService.getStats();
    // Should have roughly 10% of events (allowing for variance)
    expect(stats.totalEvents).toBeLessThan(50);
    expect(stats.totalEvents).toBeGreaterThan(0);
  });

  test('should enable/disable monitoring', () => {
    const TestComponent = () => {
      const { trackEvent, setEnabled, getStats } = useMonitoring();
      const [isEnabled, setIsEnabledState] = React.useState(true);
      
      const handleToggle = () => {
        setEnabled(!isEnabled);
        setIsEnabledState(!isEnabled);
      };

      const handleTrack = () => {
        trackEvent({
          message: 'Toggle test event',
          category: MonitoringCategory.SYSTEM,
        });
      };

      return (
        <div>
          <span data-testid="enabled">{isEnabled ? 'enabled' : 'disabled'}</span>
          <button onClick={handleToggle}>Toggle</button>
          <button onClick={handleTrack}>Track</button>
          <span data-testid="event-count">{getStats().service.totalEvents}</span>
        </div>
      );
    };

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
      >
        <TestComponent />
      </MonitoringProvider>
    );

    // Track event while enabled
    fireEvent.click(screen.getByText('Track'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');

    // Disable monitoring
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('disabled');

    // Track event while disabled
    fireEvent.click(screen.getByText('Track'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('1'); // Still 1
  });
});

describe('withMonitoring HOC', () => {
  let monitoringService: MonitoringService;
  let offlineQueue: OfflineQueue;

  beforeEach(() => {
    monitoringService = new MonitoringService({
      serviceName: 'test-service',
      environment: 'test',
    });
    
    offlineQueue = createOfflineQueue({
      maxMemoryEvents: 10,
    });
  });

  test('should wrap component with monitoring', () => {
    const TestComponent = ({ name }: { name: string }) => <div>Hello {name}</div>;
    const MonitoredComponent = withMonitoring(TestComponent, {
      trackProps: ['name'],
      trackMount: true,
    });

    render(
      <MonitoringProvider service={monitoringService} offlineQueue={offlineQueue}>
        <MonitoredComponent name="World" />
      </MonitoringProvider>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('should track component lifecycle', async () => {
    const TestComponent = ({ count }: { count: number }) => <div>Count: {count}</div>;
    const MonitoredComponent = withMonitoring(TestComponent, {
      trackMount: true,
      trackUnmount: true,
    });

    const { unmount } = render(
      <MonitoringProvider service={monitoringService} offlineQueue={offlineQueue}>
        <MonitoredComponent count={1} />
      </MonitoringProvider>
    );

    // Component should be tracked on mount
    await waitFor(() => {
      const stats = monitoringService.getStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
    });

    // Component should be tracked on unmount
    unmount();
    
    await waitFor(() => {
      const stats = monitoringService.getStats();
      expect(stats.totalEvents).toBeGreaterThan(1);
    });
  });
});

describe('Integration Tests', () => {
  test('should integrate monitoring service with offline queue', async () => {
    const monitoringService = new MonitoringService({
      serviceName: 'integration-test',
      environment: 'test',
    });
    
    const offlineQueue = createOfflineQueue({
      maxMemoryEvents: 5,
    });

    // Add processor to queue
    offlineQueue.addProcessor(async (events) => {
      const results = await Promise.all(
        events.map(event => monitoringService.trackEvent(event))
      );
      
      const processed = results.filter(r => r.success).length;
      const failed = results.length - processed;
      
      return {
        success: failed === 0,
        processed,
        failed,
        remaining: 0,
      };
    });

    // Add events to queue
    const events: MonitoringEvent[] = [
      {
        id: 'integration-1',
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: 'Integration test event 1',
      },
      {
        id: 'integration-2',
        timestamp: Date.now(),
        severity: MonitoringSeverity.WARNING,
        category: MonitoringCategory.PERFORMANCE,
        message: 'Integration test event 2',
      },
    ];

    events.forEach(event => offlineQueue.addEvent(event));
    
    // Flush queue
    const result = await offlineQueue.flush();
    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    
    // Verify events were tracked
    const stats = monitoringService.getStats();
    expect(stats.totalEvents).toBe(2);
  });

  test('should handle redaction in monitoring pipeline', () => {
    const redactor = new DataRedactor({
      enabled: true,
      rules: DEFAULT_REDACTION_RULES,
    });

    const sensitiveData = {
      user: {
        email: 'user@example.com',
        password: 'secret123',
        name: 'John Doe',
      },
      metadata: {
        apiKey: 'sk-1234567890abcdef',
        timestamp: Date.now(),
      },
    };

    const result = redactor.redact(sensitiveData);
    expect(result.modified).toBe(true);
    expect(result.redactionCount).toBeGreaterThan(0);
    
    const redacted = result.data as any;
    expect(redacted.user.email).toBe('[REDACTED_EMAIL]');
    expect(redacted.user.password).toBe('[REDACTED]');
    expect(redacted.user.name).toBe('John Doe'); // Not redacted
    expect(redacted.metadata.apiKey).toBe('[REDACTED_TOKEN]');
    expect(redacted.metadata.timestamp).toBeDefined(); // Not redacted
  });

  test('should handle monitoring provider with all features', async () => {
    const monitoringService = new MonitoringService({
      serviceName: 'full-test',
      environment: 'test',
    });
    
    const offlineQueue = createOfflineQueue();
    const redactor = new DataRedactor();

    const TestComponent = () => {
      const { trackEvent, trackError, trackPerformance, trackUserAction } = useMonitoring();
      
      React.useEffect(() => {
        // Track different types of events
        trackEvent({
          message: 'Test event',
          category: MonitoringCategory.SYSTEM,
        });
        
        trackPerformance('load_time', 1500);
        trackUserAction('button_click', { buttonId: 'test' });
        
        // Track error with sensitive data
        const error = new Error('Test error with sensitive data');
        try {
          throw error;
        } catch (e) {
          trackError(e, { 
            userEmail: 'user@example.com',
            apiKey: 'secret-key-123',
          });
        }
      }, [trackEvent, trackError, trackPerformance, trackUserAction]);

      return <div>Full Test Component</div>;
    };

    render(
      <MonitoringProvider
        service={monitoringService}
        offlineQueue={offlineQueue}
        trackErrors={true}
        trackPerformance={true}
        trackUserActions={true}
        samplingRate={1.0}
      >
        <TestComponent />
      </MonitoringProvider>
    );

    await waitFor(() => {
      const stats = monitoringService.getStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
    });

    // Verify redaction was applied to sensitive data
    const events = monitoringService.getRecentEvents(10);
    const errorEvent = events.find(e => e.message.includes('Test error'));
    
    if (errorEvent && errorEvent.data) {
      const eventData = errorEvent.data as any;
      // Should have been redacted by the monitoring service
      expect(eventData.userEmail).not.toBe('user@example.com');
      expect(eventData.apiKey).not.toBe('secret-key-123');
    }
  });
});

describe('Error Handling and Edge Cases', () => {
  test('should handle invalid monitoring events', async () => {
    const monitoringService = new MonitoringService({
      serviceName: 'error-test',
      environment: 'test',
    });

    const invalidEvents = [
      null,
      undefined,
      {},
      { id: '', timestamp: 0 },
      { id: 'test', timestamp: Date.now(), severity: 'invalid' as any },
    ];

    for (const event of invalidEvents) {
      const result = await monitoringService.trackEvent(event as any);
      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    }
  });

  test('should handle offline queue storage errors', () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const queue = createOfflineQueue({
      maxMemoryEvents: 2,
    });

    // Add events to trigger storage
    for (let i = 0; i < 5; i++) {
      queue.addEvent({
        id: `storage-error-${i}`,
        timestamp: Date.now(),
        severity: MonitoringSeverity.INFO,
        category: MonitoringCategory.SYSTEM,
        message: `Storage error test ${i}`,
      });
    }

    // Should still work despite storage errors
    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(5);

    // Restore localStorage
    localStorageMock.setItem = originalSetItem;
  });

  test('should handle redaction of circular references', () => {
    const redactor = new DataRedactor();
    
    const circular: any = { name: 'test' };
    circular.self = circular;

    // Should not throw an error
    const result = redactor.redact(circular);
    expect(result).toBeDefined();
  });

  test('should handle very large datasets', () => {
    const redactor = new DataRedactor({
      maxStringLength: 100,
      truncateLongStrings: true,
    });

    const largeData = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        email: `user${i}@example.com`,
        name: 'x'.repeat(1000), // Very long name
        data: 'y'.repeat(10000), // Very large data field
      })),
    };

    const result = redactor.redact(largeData);
    expect(result.modified).toBe(true);
    expect(result.redactionCount).toBeGreaterThan(0);
    
    // Should have truncated long strings
    const redactedData = result.data as any;
    expect(redactedData.users[0].name.length).toBeLessThanOrEqual(103);
  });
});
