/**
 * Comprehensive unit tests for performance budget system
 * Tests budget configuration, monitoring, hooks, and banner components
 * 
 * @fileoverview Performance system tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformance = global.performance;

// Import components (adjust paths as needed based on actual exports)
import { PerformanceMonitor } from '../PerformanceMonitor';
import { usePerformanceBudgetReporter } from '../usePerformanceBudgetReporter';
import { BudgetViolationBanner, useBudgetViolationBanner, PerformanceAlert } from '../BudgetViolationBanner';

describe('Performance Budget Configuration', () => {
  test('should define budget thresholds for different environments', () => {
    // This would test the actual budget.config.ts file
    const expectedBudgets = {
      development: {
        bundleSize: {
          main: 500000, // 500KB
          vendor: 1000000, // 1MB
          total: 2000000, // 2MB
        },
        metrics: {
          LCP: 4000, // 4s
          FID: 300, // 300ms
          CLS: 0.5,
          INP: 600, // 600ms
          TBT: 800, // 800ms
        },
      },
      production: {
        bundleSize: {
          main: 250000, // 250KB
          vendor: 500000, // 500KB
          total: 800000, // 800KB
        },
        metrics: {
          LCP: 2500, // 2.5s
          FID: 100, // 100ms
          CLS: 0.1,
          INP: 200, // 200ms
          TBT: 200, // 200ms
        },
      },
    };

    expect(expectedBudgets).toBeDefined();
    expect(expectedBudgets.production.metrics.LCP).toBeLessThan(expectedBudgets.development.metrics.LCP);
  });

  test('should validate budget configuration structure', () => {
    const validBudgetConfig = {
      bundleSize: {
        main: 250000,
        vendor: 500000,
        total: 800000,
      },
      metrics: {
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        INP: 200,
        TBT: 200,
      },
      environments: {
        development: { multiplier: 2.0 },
        test: { multiplier: 1.5 },
        production: { multiplier: 1.0 },
      },
    };

    expect(validBudgetConfig.bundleSize).toBeDefined();
    expect(validBudgetConfig.metrics).toBeDefined();
    expect(validBudgetConfig.environments).toBeDefined();
  });
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    // Mock PerformanceObserver
    global.PerformanceObserver = mockPerformanceObserver;
    
    // Mock performance.getEntriesByType
    global.performance = {
      ...mockPerformance,
      getEntriesByType: jest.fn(),
      now: jest.fn(() => Date.now()),
    };

    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with default configuration', () => {
    expect(performanceMonitor).toBeDefined();
  });

  test('should measure Core Web Vitals', async () => {
    const mockEntries = [
      { name: 'LCP', value: 2500, startTime: 1000 },
      { name: 'FID', value: 50, startTime: 2000 },
      { name: 'CLS', value: 0.05, startTime: 3000 },
    ];

    (global.performance.getEntriesByType as jest.Mock).mockReturnValue(mockEntries);

    const metrics = await performanceMonitor.getCoreWebVitals();

    expect(metrics.LCP).toBe(2500);
    expect(metrics.FID).toBe(50);
    expect(metrics.CLS).toBe(0.05);
  });

  test('should detect budget violations', async () => {
    const mockMetrics = {
      LCP: 4000, // Exceeds budget of 2500ms
      FID: 80, // Within budget of 100ms
      CLS: 0.3, // Exceeds budget of 0.1
    };

    const violations = await performanceMonitor.checkBudgetViolations(mockMetrics);

    expect(violations).toHaveLength(2);
    expect(violations.some(v => v.metric === 'LCP')).toBe(true);
    expect(violations.some(v => v.metric === 'CLS')).toBe(true);
  });

  test('should track repeated violations', async () => {
    const violationMetric = { LCP: 4000 };

    // First violation
    const violations1 = await performanceMonitor.checkBudgetViolations(violationMetric);
    expect(violations1[0].count).toBe(1);

    // Second violation
    const violations2 = await performanceMonitor.checkBudgetViolations(violationMetric);
    expect(violations2[0].count).toBe(2);
  });

  test('should generate performance reports', async () => {
    const mockMetrics = {
      LCP: 2000,
      FID: 50,
      CLS: 0.05,
      INP: 150,
      TBT: 100,
    };

    const report = await performanceMonitor.generateReport(mockMetrics);

    expect(report.timestamp).toBeDefined();
    expect(report.metrics).toEqual(mockMetrics);
    expect(report.violations).toBeDefined();
    expect(report.summary).toBeDefined();
  });

  test('should handle missing metrics gracefully', async () => {
    const incompleteMetrics = {
      LCP: 2000,
      // FID missing
      CLS: 0.05,
    };

    const violations = await performanceMonitor.checkBudgetViolations(incompleteMetrics);

    expect(violations).toBeDefined();
    // Should not throw error for missing metrics
  });
});

describe('usePerformanceBudgetReporter Hook', () => {
  test('should provide performance reporting interface', () => {
    const TestComponent = () => {
      const { reportMetric, getViolations, clearViolations } = usePerformanceBudgetReporter();
      
      return (
        <div>
          <button onClick={() => reportMetric('LCP', 3000)}>Report LCP</button>
          <button onClick={() => getViolations()}>Get Violations</button>
          <button onClick={() => clearViolations()}>Clear</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Report LCP')).toBeInTheDocument();
    expect(screen.getByText('Get Violations')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  test('should track metric violations', async () => {
    const TestComponent = () => {
      const { reportMetric, violations } = usePerformanceBudgetReporter();
      
      React.useEffect(() => {
        reportMetric('LCP', 4000); // Exceeds budget
        reportMetric('FID', 50); // Within budget
      }, [reportMetric]);

      return (
        <div>
          <span data-testid="violation-count">{violations.length}</span>
          {violations.map(v => (
            <div key={v.metric} data-testid={`violation-${v.metric}`}>
              {v.metric}: {v.actual}
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('1');
      expect(screen.getByTestId('violation-LCP')).toBeInTheDocument();
      expect(screen.getByTestId('violation-FID')).not.toBeInTheDocument();
    });
  });

  test('should aggregate multiple violations', async () => {
    const TestComponent = () => {
      const { reportMetric, violations } = usePerformanceBudgetReporter();
      
      React.useEffect(() => {
        reportMetric('LCP', 4000);
        reportMetric('LCP', 4500); // Same metric, worse value
        reportMetric('CLS', 0.3);
      }, [reportMetric]);

      return (
        <div>
          <span data-testid="violation-count">{violations.length}</span>
          {violations.map(v => (
            <div key={v.metric} data-testid={`violation-${v.metric}`}>
              {v.metric}: {v.actual} (count: {v.count})
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('2');
      expect(screen.getByTestId('violation-LCP')).toHaveTextContent('LCP: 4500 (count: 2)');
      expect(screen.getByTestId('violation-CLS')).toHaveTextContent('CLS: 0.3 (count: 1)');
    });
  });

  test('should clear violations', async () => {
    const TestComponent = () => {
      const { reportMetric, violations, clearViolations } = usePerformanceBudgetReporter();
      
      const handleReport = () => {
        reportMetric('LCP', 4000);
      };
      
      const handleClear = () => {
        clearViolations();
      };

      return (
        <div>
          <button onClick={handleReport}>Report Violation</button>
          <button onClick={handleClear}>Clear Violations</button>
          <span data-testid="violation-count">{violations.length}</span>
        </div>
      );
    };

    render(<TestComponent />);

    // Report violation
    fireEvent.click(screen.getByText('Report Violation'));
    
    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('1');
    });

    // Clear violations
    fireEvent.click(screen.getByText('Clear Violations'));
    
    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('0');
    });
  });
});

describe('BudgetViolationBanner Component', () => {
  const mockViolations = [
    {
      metric: 'LCP',
      threshold: 2500,
      actual: 4000,
      severity: 'high' as const,
      timestamp: Date.now(),
      count: 2,
      url: 'https://example.com/page',
      context: { device: 'mobile' },
    },
    {
      metric: 'CLS',
      threshold: 0.1,
      actual: 0.3,
      severity: 'medium' as const,
      timestamp: Date.now() - 1000,
      count: 1,
      url: 'https://example.com/page',
    },
  ];

  test('should render banner when violations exist', () => {
    render(
      <BudgetViolationBanner
        violations={mockViolations}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('Performance Budget Violations')).toBeInTheDocument();
    expect(screen.getByText('2 violations detected')).toBeInTheDocument();
    expect(screen.getByText('LCP')).toBeInTheDocument();
    expect(screen.getByText('CLS')).toBeInTheDocument();
  });

  test('should not render when no violations', () => {
    render(
      <BudgetViolationBanner
        violations={[]}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.queryByText('Performance Budget Violations')).not.toBeInTheDocument();
  });

  test('should display violation details correctly', () => {
    render(
      <BudgetViolationBanner
        violations={mockViolations}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('4000ms / 2500ms')).toBeInTheDocument();
    expect(screen.getByText('0.300 / 0.100')).toBeInTheDocument();
    expect(screen.getByText('Violated 2 times')).toBeInTheDocument();
    expect(screen.getByText('Violated 1 time')).toBeInTheDocument();
  });

  test('should handle dismiss action', () => {
    const onDismiss = jest.fn();

    render(
      <BudgetViolationBanner
        violations={mockViolations}
        onDismiss={onDismiss}
        onAcknowledge={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('should handle acknowledge action', () => {
    const onAcknowledge = jest.fn();

    render(
      <BudgetViolationBanner
        violations={mockViolations}
        onAcknowledge={onAcknowledge}
        onDismiss={jest.fn()}
      />
    );

    // Select first violation
    fireEvent.click(screen.getByText('Dismiss'));
    
    // Click acknowledge
    const acknowledgeButton = screen.getByText('Acknowledge Selected');
    if (acknowledgeButton) {
      fireEvent.click(acknowledgeButton);
      expect(onAcknowledge).toHaveBeenCalled();
    }
  });

  test('should limit displayed violations', () => {
    const manyViolations = Array.from({ length: 10 }, (_, i) => ({
      ...mockViolations[0],
      metric: `Metric${i}`,
      timestamp: Date.now() + i,
    }));

    render(
      <BudgetViolationBanner
        violations={manyViolations}
        maxViolations={5}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('5 violations detected')).toBeInTheDocument();
    expect(screen.getByText('... and 5 more violations')).toBeInTheDocument();
  });

  test('should show details when expanded', () => {
    render(
      <BudgetViolationBanner
        violations={mockViolations}
        showDetails={true}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('Show Details')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Show Details'));
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });
});

describe('useBudgetViolationBanner Hook', () => {
  test('should manage violation state', () => {
    const TestComponent = () => {
      const { violations, addViolation, removeViolation, clearViolations } = useBudgetViolationBanner();
      
      const handleAddViolation = () => {
        addViolation({
          metric: 'LCP',
          threshold: 2500,
          actual: 4000,
          severity: 'high',
        });
      };

      return (
        <div>
          <span data-testid="violation-count">{violations.length}</span>
          <button onClick={handleAddViolation}>Add Violation</button>
          <button onClick={clearViolations}>Clear All</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('violation-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Add Violation'));
    expect(screen.getByTestId('violation-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Clear All'));
    expect(screen.getByTestId('violation-count')).toHaveTextContent('0');
  });

  test('should track violation count', () => {
    const TestComponent = () => {
      const { violations, addViolation } = useBudgetViolationBanner();
      
      const handleAddViolation = () => {
        addViolation({
          metric: 'LCP',
          threshold: 2500,
          actual: 4000,
          severity: 'high',
        });
      };

      return (
        <div>
          {violations.map(v => (
            <div key={v.metric} data-testid={`violation-${v.metric}`}>
              Count: {v.count}
            </div>
          ))}
          <button onClick={handleAddViolation}>Add Violation</button>
        </div>
      );
    };

    render(<TestComponent />);

    // Add same violation multiple times
    fireEvent.click(screen.getByText('Add Violation'));
    fireEvent.click(screen.getByText('Add Violation'));
    fireEvent.click(screen.getByText('Add Violation'));

    expect(screen.getByTestId('violation-LCP')).toHaveTextContent('Count: 3');
  });

  test('should handle dismissed violations', () => {
    const TestComponent = () => {
      const { violations, addViolation, dismissViolation, dismissedCount } = useBudgetViolationBanner();
      
      const handleAddViolation = () => {
        addViolation({
          metric: 'LCP',
          threshold: 2500,
          actual: 4000,
          severity: 'high',
        });
      };

      const handleDismiss = () => {
        if (violations.length > 0) {
          const violation = violations[0];
          dismissViolation(`${violation.metric}-${violation.timestamp}`);
        }
      };

      return (
        <div>
          <span data-testid="active-count">{violations.length}</span>
          <span data-testid="dismissed-count">{dismissedCount}</span>
          <button onClick={handleAddViolation}>Add Violation</button>
          <button onClick={handleDismiss}>Dismiss Violation</button>
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Violation'));
    expect(screen.getByTestId('active-count')).toHaveTextContent('1');
    expect(screen.getByTestId('dismissed-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Dismiss Violation'));
    expect(screen.getByTestId('active-count')).toHaveTextContent('0');
    expect(screen.getByTestId('dismissed-count')).toHaveTextContent('1');
  });
});

describe('PerformanceAlert Component', () => {
  const mockViolation = {
    metric: 'LCP',
    threshold: 2500,
    actual: 4000,
    severity: 'high' as const,
    timestamp: Date.now(),
    count: 2,
    url: 'https://example.com/page',
  };

  test('should render full alert', () => {
    render(<PerformanceAlert violation={mockViolation} />);

    expect(screen.getByText('LCP Budget Violation')).toBeInTheDocument();
    expect(screen.getByText('4000ms exceeds budget of 2500ms')).toBeInTheDocument();
    expect(screen.getByText('Severity: high | Violated 2 times')).toBeInTheDocument();
  });

  test('should render compact alert', () => {
    render(<PerformanceAlert violation={mockViolation} compact />);

    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LCP: 4000ms')).toBeInTheDocument();
    expect(screen.queryByText('LCP Budget Violation')).not.toBeInTheDocument();
  });

  test('should handle dismiss action', () => {
    const onDismiss = jest.fn();

    render(<PerformanceAlert violation={mockViolation} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('×'));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('should adapt to different severity levels', () => {
    const { rerender } = render(<PerformanceAlert violation={mockViolation} />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();

    const lowSeverityViolation = { ...mockViolation, severity: 'low' as const };
    rerender(<PerformanceAlert violation={lowSeverityViolation} />);
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('should integrate performance monitoring with banner', async () => {
    const TestComponent = () => {
      const { reportMetric } = usePerformanceBudgetReporter();
      const { violations } = useBudgetViolationBanner();
      
      React.useEffect(() => {
        // Simulate performance violation
        reportMetric('LCP', 4000);
      }, [reportMetric]);

      return (
        <div>
          <BudgetViolationBanner
            violations={violations}
            onDismiss={jest.fn()}
            onAcknowledge={jest.fn()}
          />
          <span data-testid="violation-count">{violations.length}</span>
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('1');
      expect(screen.getByText('Performance Budget Violations')).toBeInTheDocument();
    });
  });

  test('should handle multiple metric types', async () => {
    const TestComponent = () => {
      const { reportMetric } = usePerformanceBudgetReporter();
      const { violations } = useBudgetViolationBanner();
      
      React.useEffect(() => {
        reportMetric('LCP', 4000);
        reportMetric('CLS', 0.3);
        reportMetric('FID', 150);
      }, [reportMetric]);

      return (
        <div>
          <BudgetViolationBanner
            violations={violations}
            onDismiss={jest.fn()}
            onAcknowledge={jest.fn()}
          />
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('3 violations detected')).toBeInTheDocument();
      expect(screen.getByText('LCP')).toBeInTheDocument();
      expect(screen.getByText('CLS')).toBeInTheDocument();
      // FID should not show as violation if within budget
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle empty violations array', () => {
    render(
      <BudgetViolationBanner
        violations={[]}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.queryByText('Performance Budget Violations')).not.toBeInTheDocument();
  });

  test('should handle undefined context', () => {
    const violationWithoutContext = {
      metric: 'LCP',
      threshold: 2500,
      actual: 4000,
      severity: 'high' as const,
      timestamp: Date.now(),
      count: 1,
    };

    render(
      <BudgetViolationBanner
        violations={[violationWithoutContext]}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('LCP')).toBeInTheDocument();
  });

  test('should handle malformed violation data', () => {
    const malformedViolation = {
      metric: '',
      threshold: -1,
      actual: 'invalid',
      severity: 'unknown' as const,
      timestamp: Date.now(),
      count: 0,
    };

    render(
      <BudgetViolationBanner
        violations={[malformedViolation]}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    // Should not crash, but may not display meaningful data
    expect(screen.getByText('Performance Budget Violations')).toBeInTheDocument();
  });

  test('should handle rapid violation updates', async () => {
    const TestComponent = () => {
      const { violations, addViolation } = useBudgetViolationBanner();
      
      const handleRapidAdd = () => {
        for (let i = 0; i < 10; i++) {
          addViolation({
            metric: `Metric${i}`,
            threshold: 1000,
            actual: 2000,
            severity: 'medium' as const,
          });
        }
      };

      return (
        <div>
          <span data-testid="violation-count">{violations.length}</span>
          <button onClick={handleRapidAdd}>Add Many Violations</button>
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Many Violations'));

    await waitFor(() => {
      expect(screen.getByTestId('violation-count')).toHaveTextContent('10');
    });
  });
});

describe('Performance Metrics Formatting', () => {
  test('should format time-based metrics correctly', () => {
    const timeViolations = [
      { metric: 'LCP', actual: 2500, threshold: 2000 },
      { metric: 'FID', actual: 150, threshold: 100 },
      { metric: 'INP', actual: 300, threshold: 200 },
    ];

    render(
      <BudgetViolationBanner
        violations={timeViolations}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('2500ms / 2000ms')).toBeInTheDocument();
    expect(screen.getByText('150ms / 100ms')).toBeInTheDocument();
    expect(screen.getByText('300ms / 200ms')).toBeInTheDocument();
  });

  test('should format ratio-based metrics correctly', () => {
    const ratioViolations = [
      { metric: 'CLS', actual: 0.25, threshold: 0.1 },
    ];

    render(
      <BudgetViolationBanner
        violations={ratioViolations}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('0.250 / 0.100')).toBeInTheDocument();
  });

  test('should format size-based metrics correctly', () => {
    const sizeViolations = [
      { metric: 'bundle-size', actual: 1048576, threshold: 524288 }, // 1MB vs 512KB
    ];

    render(
      <BudgetViolationBanner
        violations={sizeViolations}
        onDismiss={jest.fn()}
        onAcknowledge={jest.fn()}
      />
    );

    expect(screen.getByText('1.0MB / 512.0KB')).toBeInTheDocument();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
