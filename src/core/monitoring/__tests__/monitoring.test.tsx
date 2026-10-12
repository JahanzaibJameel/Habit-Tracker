/**
 * Unit tests for the monitoring toolkit.
 * Covers OfflineQueue, DataRedaction, redaction rules, and the
 * MonitoringService (real API).
 *
 * @fileoverview Monitoring system tests
 * @version 2.0.0
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import type { MonitoringEvent, MonitoringAdapter, ErrorEvent } from '../types';
import { MonitoringCategory, MonitoringSeverity, MonitoringEventFactory } from '../types';
import { createOfflineQueue, type OfflineQueue as OfflineQueueType } from '../OfflineQueue';
import { DataRedactor, DEFAULT_REDACTION_RULES, DEFAULT_SENSITIVE_FIELDS } from '../DataRedaction';
import { MonitoringService } from '../MonitoringService';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// OfflineQueue
// ---------------------------------------------------------------------------
describe('OfflineQueue', () => {
  let queue: OfflineQueueType;

  const createMonitoringEvent = (overrides: Partial<MonitoringEvent> = {}): MonitoringEvent =>
    ({
      id: `evt-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      severity: MonitoringSeverity.ERROR,
      category: MonitoringCategory.ERROR,
      message: 'Test error',
      ...overrides,
    }) as MonitoringEvent;

  beforeEach(() => {
    try {
      queue = createOfflineQueue({
        maxMemoryEvents: 100,
      });
    } catch {
      queue = createOfflineQueue({
        maxMemoryEvents: 100,
      });
    }
  });

  afterEach(() => {
    queue.clear();
  });

  test('creates a queue', () => {
    expect(queue).toBeDefined();
  });

  test('adds a valid event', () => {
    const event = createMonitoringEvent();
    expect(queue.addEvent(event)).toBe(true);
  });

  test('rejects an invalid event', () => {
    const invalid = createMonitoringEvent({
      id: '' as unknown as string,
      severity: 'invalid' as unknown as MonitoringSeverity,
    });
    expect(queue.addEvent(invalid)).toBe(false);
  });

  test('adds multiple events and reports how many were accepted', () => {
    const accepted = queue.addEvents([
      createMonitoringEvent(),
      createMonitoringEvent(),
      createMonitoringEvent({
        id: '' as unknown as string,
        severity: 'x' as unknown as MonitoringSeverity,
      }),
    ]);
    expect(accepted).toBe(2);
  });

  test('provides queue statistics', () => {
    queue.addEvent(createMonitoringEvent());
    const stats = queue.getStats();
    expect(stats.memoryEvents).toBe(1);
    expect(stats.totalEvents).toBe(1);
  });

  test('processes events with a registered processor', async () => {
    queue.addEvent(createMonitoringEvent());
    queue.addProcessor(async () => ({ success: true, processed: 1, failed: 0, remaining: 0 }));

    const result = await queue.flush();
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
  });

  test('reports processing failures without throwing', async () => {
    queue.addEvent(createMonitoringEvent());
    queue.addProcessor(async () => ({
      success: false,
      processed: 0,
      failed: 1,
      remaining: 1,
      error: 'boom',
    }));

    const result = await queue.flush();
    expect(result.failed).toBe(1);
  });

  test('refuses to re-enter flush while already processing', async () => {
    queue.addEvent(createMonitoringEvent());
    let release = () => {};
    queue.addProcessor(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ success: true, processed: 0, failed: 0, remaining: 0 });
        })
    );

    const first = queue.flush();
    const second = await queue.flush();
    expect(second.error).toContain('already processing');
    release();
    await first;
  });

  test('filters events by severity', () => {
    queue.addEvent(createMonitoringEvent({ severity: MonitoringSeverity.ERROR }));
    queue.addEvent(createMonitoringEvent({ severity: MonitoringSeverity.WARNING }));
    expect(queue.getEventsBySeverity(MonitoringSeverity.ERROR)).toHaveLength(1);
    expect(queue.getEventsBySeverity(MonitoringSeverity.WARNING)).toHaveLength(1);
  });

  test('exports and imports events', () => {
    const json = queue.exportEvents();
    expect(typeof json).toBe('string');

    queue.clear();
    expect(queue.getStats().totalEvents).toBe(0);

    const imported = queue.importEvents(
      JSON.stringify({
        events: [createMonitoringEvent({ id: 'a' }), createMonitoringEvent({ id: 'b' })],
      })
    );
    expect(imported).toBe(2);
    expect(queue.getStats().totalEvents).toBe(2);
  });

  test('clears all events and stats', () => {
    queue.addEvent(createMonitoringEvent());
    expect(queue.getStats().memoryEvents).toBe(1);
    queue.clear();
    expect(queue.getStats().memoryEvents).toBe(0);
    expect(queue.getStats().totalEvents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_REDACTION_RULES
// ---------------------------------------------------------------------------
describe('DEFAULT_REDACTION_RULES', () => {
  test('exposes named, actionable rules', () => {
    expect(Array.isArray(DEFAULT_REDACTION_RULES)).toBe(true);
    expect(DEFAULT_REDACTION_RULES.length).toBeGreaterThan(0);

    for (const rule of DEFAULT_REDACTION_RULES) {
      expect(rule.description).toBeTruthy();
      expect(rule.replacement).toBeTruthy();
    }
  });

  test('matches an email address', () => {
    const emailRule = DEFAULT_REDACTION_RULES.find((r) => r.description === 'Email addresses');
    expect(emailRule).toBeDefined();
    expect(emailRule!.replacement).toBe('[REDACTED_EMAIL]');
    const redacted = 'Contact me: john.doe@example.com now'.replace(
      emailRule!.pattern,
      emailRule!.replacement
    );
    expect(redacted).toContain('[REDACTED_EMAIL]');
    expect(redacted).not.toContain('john.doe@example.com');
  });
});

// ---------------------------------------------------------------------------
// DataRedactor
// ---------------------------------------------------------------------------
describe('DataRedactor', () => {
  test('replaces sensitive field values with the default marker', () => {
    const redactor = new DataRedactor();
    const result = redactor.redact({ password: 'hunter2', token: 'abc' });
    expect(result.modified).toBe(true);
    expect(result.data).toEqual({ password: '[REDACTED]', token: '[REDACTED]' });
  });

  test('applies pattern rules to non-sensitive string values', () => {
    const redactor = new DataRedactor();
    const result = redactor.redact({ note: 'reach me at jane.doe@example.com' });
    expect((result.data as Record<string, string>).note).toBe('reach me at [REDACTED_EMAIL]');
  });

  test('redacts sensitive fields while preserving non-sensitive data', () => {
    const redactor = new DataRedactor();
    const result = redactor.redact({
      profile: { name: 'John Doe', email: 'john@example.com', plan: 'premium' },
    });
    const data = result.data as { profile: Record<string, string> };
    expect(data.profile.name).toBe('John Doe');
    expect(data.profile.plan).toBe('premium');
    expect(data.profile.email).toBe('[REDACTED]');
  });

  test('supports arrays', () => {
    const redactor = new DataRedactor();
    const result = redactor.redact({ scores: [1, 2, 3], tags: ['alpha', 'beta'] });
    const data = result.data as { scores: number[]; tags: string[] };
    expect(data.scores).toEqual([1, 2, 3]);
    expect(data.tags).toEqual(['alpha', 'beta']);
  });

  test('does not modify data when disabled', () => {
    const redactor = new DataRedactor({ enabled: false });
    const data = { email: 'john@example.com', password: 'nope' };
    const result = redactor.redact(data);
    expect(result.modified).toBe(false);
    expect(result.data).toEqual(data);
  });

  test('reports how many redactions were applied through redact()', () => {
    const redactor = new DataRedactor();
    const result = redactor.redact({ a: 'x@y.com', b: 'plain text', c: 'z@w.com' });
    expect(result.redactionCount).toBe(2);
  });

  test('does not overflow the stack on circular references', () => {
    const redactor = new DataRedactor();
    const circular: Record<string, unknown> = { name: 'root', email: 'a@b.com' };
    circular.self = circular;

    let result: ReturnType<DataRedactor['redact']> | undefined;
    expect(() => {
      result = redactor.redact(circular);
    }).not.toThrow();
    expect(result).toBeDefined();
  });

  test('truncates long non-sensitive strings when enabled', () => {
    const redactor = new DataRedactor({ maxStringLength: 32, truncateLongStrings: true });
    const result = redactor.redact({ description: 'x'.repeat(100) });
    expect((result.data as Record<string, string>).description).toContain('...');
    expect((result.data as Record<string, string>).description).toHaveLength(32);
  });

  test('recognizes sensitive fields', () => {
    const redactor = new DataRedactor();
    expect(redactor.isSensitiveField('password')).toBe(true);
    expect(redactor.isSensitiveField('name')).toBe(false);
  });

  test('applies a custom rule', () => {
    const redactor = new DataRedactor();
    redactor.addRule({
      pattern: /ID-\d+/g,
      replacement: '[REDACTED_ID]',
      description: 'Internal IDs',
    });
    const result = redactor.redact({ reference: 'ID-12345' });
    expect((result.data as Record<string, string>).reference).toBe('[REDACTED_ID]');
  });

  test('exposes configuration statistics', () => {
    const redactor = new DataRedactor();
    const stats = redactor.getStats();
    expect(stats.enabled).toBe(true);
    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.sensitiveFields).toBe(DEFAULT_SENSITIVE_FIELDS.length);
  });
});

// ---------------------------------------------------------------------------
// MonitoringService (real API)
// ---------------------------------------------------------------------------
class MockAdapter implements MonitoringAdapter {
  readonly name = 'mock';
  events: unknown[] = [];

  async initialize(): Promise<void> {}
  async captureError(event: ErrorEvent): Promise<void> {
    this.events.push({ type: 'error', message: event.message });
  }
  async captureMessage(event: MonitoringEvent): Promise<void> {
    this.events.push({ type: 'message', message: event.message });
  }
  async captureEvent(event: MonitoringEvent): Promise<void> {
    this.events.push({ type: 'event', message: event.message, category: event.category });
  }
  async setUser(): Promise<void> {}
  async addBreadcrumb(): Promise<void> {}
  async setTag(): Promise<void> {}
  async setContext(): Promise<void> {}
  async cleanup(): Promise<void> {
    this.events = [];
  }
}

describe('MonitoringService (real API)', () => {
  let adapter: MockAdapter;
  let service: MonitoringService;

  beforeEach(() => {
    adapter = new MockAdapter();
    service = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enabled: true,
      adapter,
      samplingRate: 1.0,
      debug: false,
      autoErrorReporting: true,
      performanceMonitoring: false,
      userActionTracking: false,
      redactionRules: [],
      offlineQueue: { enabled: false, maxSize: 100, flushInterval: 5000 },
      contextEnrichers: [],
      enableOfflineQueue: false,
      maxQueueSize: 100,
      queueFlushInterval: 5000,
      enableSessionTracking: false,
      sessionTimeout: 1800000,
    });
  });

  afterEach(() => {
    service.cleanup();
  });

  test('records a system event on initialization', async () => {
    await service.initialize();
    expect(service.getStats().totalEvents).toBe(1);
    expect(adapter.events).toHaveLength(1);
  });

  test('captures errors as retrievable events', async () => {
    await service.initialize();
    await service.captureError(new Error('Boom'), { source: 'unit-test' });

    expect(service.getStats().totalEvents).toBe(2);
    const recent = service.getRecentEvents(5);
    expect(recent.some((e) => e.message === 'Boom')).toBe(true);
    expect(adapter.events.some((e) => (e as { message: string }).message === 'Boom')).toBe(true);
  });

  test('trackEvent is an alias for captureEvent', async () => {
    await service.initialize();
    const event = MonitoringEventFactory.createSystem('heartbeat', 'healthy', 'heartbeat');
    await service.trackEvent(event);
    expect(service.getStats().totalEvents).toBe(2);
    expect(service.getRecentEvents(5).some((e) => e.message === 'heartbeat')).toBe(true);
  });

  test('does not capture events when disabled', async () => {
    const disabled = new MonitoringService({
      serviceName: 'x',
      serviceVersion: '1',
      enabled: false,
      adapter,
      samplingRate: 1,
      debug: false,
      autoErrorReporting: false,
      performanceMonitoring: false,
      userActionTracking: false,
      redactionRules: [],
      offlineQueue: { enabled: false, maxSize: 10, flushInterval: 1000 },
      contextEnrichers: [],
      enableOfflineQueue: false,
      maxQueueSize: 10,
      queueFlushInterval: 1000,
      enableSessionTracking: false,
      sessionTimeout: 1000,
    });
    await disabled.initialize();
    await disabled.captureError(new Error('ignored'));
    expect(adapter.events).toHaveLength(0);
    disabled.cleanup();
  });

  test('tracks performance metrics via capturePerformance', async () => {
    await service.initialize();
    await service.capturePerformance('render', 12, 'ms', { budget: 16 });
    expect(service.getStats().totalEvents).toBe(2);
  });
});
