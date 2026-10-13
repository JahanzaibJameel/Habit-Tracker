/**
 * Unit tests for the performance budget system.
 * Exercises the real budget configuration, PerformanceMonitor, reporter hook,
 * and violation banner/hook/alert components.
 *
 * @fileoverview Performance system tests
 * @version 2.0.0
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';

import { PerformanceMonitor } from '../PerformanceMonitor';
import {
  BudgetViolationBanner,
  useBudgetViolationBanner,
  PerformanceAlert,
} from '../BudgetViolationBanner';
import { usePerformanceBudget } from '../usePerformanceBudgetReporter';
import {
  DefaultBudgets,
  DefaultBudgetConfig,
  getEffectiveBudget,
  getBreachSeverity,
  BudgetValidationRules,
  BudgetBreachSeverity,
  BudgetCategories,
} from '../budget.config';
import type { BudgetViolation } from '../BudgetViolationBanner';

// The shape of a fully-resolved budget, used for casting custom overrides.
type EffectiveBudget = ReturnType<typeof getEffectiveBudget>;

// Production budgets make thresholds stable regardless of NODE_ENV.
const budgetConfig = { ...DefaultBudgetConfig, environment: 'production' as const };

const makeBreach = (overrides: Partial<BudgetViolation> = {}): BudgetViolation => ({
  metric: 'LCP',
  threshold: 2500,
  actual: 4000,
  severity: 'high',
  timestamp: 1_0000,
  count: 2,
  ...overrides,
});

describe('Performance Budget Configuration', () => {
  test('defines budgets for each environment', () => {
    expect(DefaultBudgets.production).toBeDefined();
    expect(DefaultBudgets.development).toBeDefined();
    expect(DefaultBudgets.testing).toBeDefined();
  });

  test('production runtime budgets are the strictest of the three', () => {
    const prod = getEffectiveBudget({
      ...DefaultBudgetConfig,
      environment: 'production',
    });
    const dev = getEffectiveBudget({ ...DefaultBudgetConfig, environment: 'development' as const });

    expect(prod.runtime.lcp).toBeLessThan(dev.runtime.lcp);
    expect(prod.bundleSize.total).toBeLessThan(dev.bundleSize.total);
  });

  test('merges custom budget overrides on top of the base', () => {
    const merged = getEffectiveBudget({
      environment: 'production',
      customBudget: { runtime: { lcp: 1234 } as unknown as EffectiveBudget['runtime'] },
    } as Parameters<typeof getEffectiveBudget>[0]);
    expect(merged.runtime.lcp).toBe(1234);
    // Unspecified runtime metrics remain from production budget.
    expect(merged.runtime.fid).toBe(DefaultBudgets.production!.runtime.fid);
  });

  test('computes breach severity proportional to the overage ratio', () => {
    expect(getBreachSeverity(1000, 2000)).toBe(BudgetBreachSeverity.LOW);
    expect(getBreachSeverity(2400, 2000)).toBe(BudgetBreachSeverity.MEDIUM);
    expect(getBreachSeverity(2900, 2000)).toBe(BudgetBreachSeverity.HIGH);
    expect(getBreachSeverity(5000, 2000)).toBe(BudgetBreachSeverity.CRITICAL);
  });

  test('budget validation helpers behave monotonically', () => {
    expect(BudgetValidationRules.validateBundleSize(100, 200)).toBe(true);
    expect(BudgetValidationRules.validateBundleSize(300, 200)).toBe(false);
    // Animation: higher FPS is better, so it inverts the comparison.
    expect(BudgetValidationRules.validateAnimationPerformance(30, 60, 'minFps')).toBe(false);
    expect(BudgetValidationRules.validateAnimationPerformance(60, 60, 'minFps')).toBe(true);
  });

  test('exposes stable budget categories', () => {
    expect(BudgetCategories.RUNTIME_PERFORMANCE).toBe('runtime');
    expect(BudgetCategories.MEMORY).toBe('memory');
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ budgetConfig });
  });

  afterEach(() => {
    monitor.stop();
    vi.restoreAllMocks();
  });

  test('records metrics and returns the latest value', () => {
    monitor.recordMetric('custom-metric', 100, 'runtime');
    monitor.recordMetric('custom-metric', 150, 'runtime');
    expect(monitor.getMetricValue('custom-metric')).toBe(150);
    expect(monitor.getMetricValue('missing-metric')).toBeUndefined();
  });

  test('detects runtime budget breaches with the configured budget', () => {
    monitor.recordMetric('lcp', 5000, 'runtime');

    const breaches = monitor.getBreaches();
    expect(breaches).toHaveLength(1);
    expect(breaches[0]!.metric).toBe('lcp');
    expect(breaches[0]!.actual).toBe(5000);
    expect(breaches[0]!.budget).toBe(2500);
    expect(breaches[0]!.category).toBe('runtime');
  });

  test('does not breach when the value is within budget', () => {
    monitor.recordMetric('lcp', 2000, 'runtime');
    expect(monitor.getBreaches()).toHaveLength(0);
  });

  test('detects memory breaches against the memory budget', () => {
    monitor.recordMetric('maxDomNodes', 2000, 'memory');
    const breaches = monitor.getBreaches();
    expect(breaches).toHaveLength(1);
    expect(breaches[0]!.category).toBe('memory');
  });

  test('treats lower FPS as a breach (inverted comparison)', () => {
    monitor.recordMetric('minFps', 30, 'animation');
    const breaches = monitor.getBreaches();
    expect(breaches).toHaveLength(1);
    expect(breaches[0]!.metric).toBe('minFps');
  });

  test('computes breach statistics grouped by category', () => {
    monitor.recordMetric('lcp', 3000, 'runtime');
    monitor.recordMetric('fid', 200, 'runtime');
    monitor.recordMetric('maxDomNodes', 2000, 'memory');

    const stats = monitor.getBreachStats();
    expect(stats.total).toBe(3);
    expect(stats.byCategory.runtime).toBe(2);
    expect(stats.byCategory.memory).toBe(1);
    expect(stats.recent).toBe(3);
  });

  test('exports recorded data as JSON', () => {
    monitor.recordMetric('lcp', 5000, 'runtime');
    const parsed = JSON.parse(monitor.exportData());
    expect(parsed.timestamp).toBeDefined();
    expect(Array.isArray(parsed.metrics)).toBe(true);
    expect(
      parsed.metrics.some(
        (m: { name: string; value: number }) => m.name === 'lcp' && m.value === 5000
      )
    ).toBe(true);
    expect(parsed.breaches).toHaveLength(1);
    expect(parsed.breaches[0].metric).toBe('lcp');
    expect(parsed.stats.total).toBe(1);
  });

  test('clears all recorded data on request', () => {
    monitor.recordMetric('lcp', 5000, 'runtime');
    expect(monitor.getBreaches()).toHaveLength(1);

    monitor.clearData();
    expect(monitor.getBreaches()).toHaveLength(0);
    expect(monitor.getMetricValue('lcp')).toBeUndefined();
  });

  test('uses a custom budget override when provided', () => {
    const custom = new PerformanceMonitor({
      budgetConfig: {
        ...budgetConfig,
        customBudget: { runtime: { lcp: 1000 } as unknown as EffectiveBudget['runtime'] },
      },
    });
    custom.recordMetric('lcp', 1500, 'runtime');
    const breaches = custom.getBreaches();
    expect(breaches).toHaveLength(1);
    expect(breaches[0]!.budget).toBe(1000);
    custom.stop();
  });

  test('skips monitoring when the sampling rate excludes this session', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sampled = new PerformanceMonitor({ budgetConfig, samplingRate: 0 });
    sampled.start();
    expect(spy).toHaveBeenCalledWith('Performance monitoring skipped (sampling rate)');
    sampled.stop();
    spy.mockRestore();
  });
});

describe('usePerformanceBudget hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('exposes the monitoring/reporting interface', () => {
    let api: ReturnType<typeof usePerformanceBudget> | undefined;
    const TestComponent = () => {
      api = usePerformanceBudget({ enableRealTimeMonitoring: false, budgetConfig });
      return (
        <div>
          <button onClick={() => api!.actions.recordMetric('lcp', 3000, 'runtime')}>Report</button>
          <button onClick={() => api!.actions.clearData()}>Clear</button>
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(api!.actions.getBreaches()).toEqual([]);
  });

  test('records a breach that surfaces through getBreaches()', () => {
    let api: ReturnType<typeof usePerformanceBudget> | undefined;
    const TestComponent = () => {
      api = usePerformanceBudget({ enableRealTimeMonitoring: false, budgetConfig });
      React.useEffect(() => {
        api!.actions.recordMetric('lcp', 4000, 'runtime');
        api!.actions.recordMetric('fid', 50, 'runtime');
      }, []);
      return null;
    };

    render(<TestComponent />);
    const breaches = api!.actions.getBreaches();
    expect(breaches.some((b) => b.metric === 'lcp')).toBe(true);
    expect(breaches.some((b) => b.metric === 'fid')).toBe(false);
  });
});

describe('BudgetViolationBanner', () => {
  test('renders a summary when violations exist', () => {
    render(
      <BudgetViolationBanner
        violations={[
          makeBreach(),
          makeBreach({ metric: 'CLS', severity: 'medium', threshold: 0.1, actual: 0.3, count: 1 }),
        ]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('Performance Budget Violations')).toBeInTheDocument();
    expect(screen.getByText('2 violations detected')).toBeInTheDocument();
    expect(screen.getByText('LCP')).toBeInTheDocument();
    expect(screen.getByText('CLS')).toBeInTheDocument();
  });

  test('renders nothing when there are no violations', () => {
    render(<BudgetViolationBanner violations={[]} onDismiss={vi.fn()} />);
    expect(screen.queryByText('Performance Budget Violations')).not.toBeInTheDocument();
  });

  test('formats time-based, ratio-based and size-based metrics', () => {
    render(
      <BudgetViolationBanner
        violations={[
          makeBreach({ metric: 'INP', actual: 300, threshold: 200, severity: 'medium', count: 1 }),
          makeBreach({ metric: 'CLS', actual: 0.25, threshold: 0.1, severity: 'medium', count: 1 }),
          makeBreach({
            metric: 'bundle-size',
            actual: 300000,
            threshold: 250000,
            severity: 'medium',
            count: 1,
          }),
        ]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('300ms / 200ms')).toBeInTheDocument();
    expect(screen.getByText('0.250 / 0.100')).toBeInTheDocument();
    expect(screen.getByText('293.0KB / 244.1KB')).toBeInTheDocument();
  });

  test('limits displayed violations and reports the remainder', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeBreach({ metric: `Metric${i}`, timestamp: i })
    );
    render(<BudgetViolationBanner violations={many} maxViolations={5} onDismiss={vi.fn()} />);
    expect(screen.getByText('10 violations detected')).toBeInTheDocument();
    expect(screen.getByText('... and 5 more violations')).toBeInTheDocument();
  });

  test('invokes onDismiss with every violation id when dismissed', () => {
    const onDismiss = vi.fn();
    render(<BudgetViolationBanner violations={[makeBreach()]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(['LCP-10000']);
  });

  test('acknowledges only the selected violations', () => {
    const onAcknowledge = vi.fn();
    render(
      <BudgetViolationBanner
        violations={[
          makeBreach(),
          makeBreach({ metric: 'CLS', threshold: 0.1, actual: 0.3, severity: 'medium', count: 1 }),
        ]}
        onDismiss={vi.fn()}
        onAcknowledge={onAcknowledge}
      />
    );

    // Select only the first violation, then acknowledge it.
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByText('Acknowledge Selected'));
    expect(onAcknowledge).toHaveBeenCalledWith(['LCP-10000']);
  });

  test('toggles extended details', () => {
    render(<BudgetViolationBanner violations={[makeBreach()]} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText('Show Details'));
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });
});

describe('useBudgetViolationBanner hook', () => {
  const TestComponent = () => {
    const { violations, addViolation, clearViolations, dismissViolation, dismissedCount } =
      useBudgetViolationBanner();

    const add = () =>
      addViolation({ metric: 'lcp', threshold: 2500, actual: 4000, severity: 'high' });

    return (
      <div>
        <span data-testid="active">{violations.length}</span>
        <span data-testid="dismissed">{dismissedCount}</span>
        <button onClick={add}>Add Violation</button>
        <button onClick={clearViolations}>Clear All</button>
        <button
          onClick={() =>
            violations[0] && dismissViolation(`${violations[0].metric}-${violations[0].timestamp}`)
          }
        >
          Dismiss Violation
        </button>
      </div>
    );
  };

  test('adds, dismisses and clears violations', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('active')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Add Violation'));
    expect(screen.getByTestId('active')).toHaveTextContent('1');
    expect(screen.getByTestId('dismissed')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Dismiss Violation'));
    expect(screen.getByTestId('active')).toHaveTextContent('0');
    expect(screen.getByTestId('dismissed')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Clear All'));
    expect(screen.getByTestId('active')).toHaveTextContent('0');
  });

  test('increments the count when the same metric is violated repeatedly', () => {
    let api: ReturnType<typeof useBudgetViolationBanner> | undefined;
    const RepeatComponent = () => {
      api = useBudgetViolationBanner();
      return (
        <button
          onClick={() =>
            api!.addViolation({ metric: 'lcp', threshold: 2500, actual: 4000, severity: 'high' })
          }
        >
          Add
        </button>
      );
    };
    render(<RepeatComponent />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    expect(api!.violations[0]!.count).toBe(3);
  });
});

describe('PerformanceAlert', () => {
  test('renders the full alert with overage details', () => {
    render(<PerformanceAlert violation={makeBreach()} />);
    expect(screen.getByText('LCP Budget Violation')).toBeInTheDocument();
    expect(screen.getByText(/4000ms exceeds budget of 2500ms/)).toBeInTheDocument();
    expect(screen.getByText('Severity: high | Violated 2 times')).toBeInTheDocument();
  });

  test('renders a compact alert', () => {
    render(<PerformanceAlert violation={makeBreach()} compact />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LCP: 4000ms')).toBeInTheDocument();
    expect(screen.queryByText('LCP Budget Violation')).not.toBeInTheDocument();
  });

  test('handles dismiss action', () => {
    const onDismiss = vi.fn();
    render(<PerformanceAlert violation={makeBreach()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('×'));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('adapts to different severity levels', () => {
    const { rerender } = render(
      <PerformanceAlert violation={makeBreach({ severity: 'high' })} compact />
    );
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    rerender(<PerformanceAlert violation={makeBreach({ severity: 'low' })} compact />);
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });
});

describe('Integration: monitor -> banner', () => {
  test('surfaces recorded breaches through the banner', () => {
    const TestComponent = () => {
      const { actions } = usePerformanceBudget({ enableRealTimeMonitoring: false, budgetConfig });
      const [violations, setViolations] = React.useState<BudgetViolation[]>([]);

      const report = () => {
        actions.recordMetric('lcp', 4000, 'runtime');
        setViolations(
          actions.getBreaches().map((b) => ({
            metric: b.metric,
            threshold: b.budget,
            actual: b.actual,
            severity: b.severity,
            timestamp: b.timestamp,
            count: 1,
          }))
        );
      };

      return (
        <div>
          <button onClick={report}>Report</button>
          <BudgetViolationBanner violations={violations} onDismiss={vi.fn()} />
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.queryByText('Performance Budget Violations')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Report'));
    expect(screen.getByText('Performance Budget Violations')).toBeInTheDocument();
    expect(screen.getByText('1 violation detected')).toBeInTheDocument();
  });
});
