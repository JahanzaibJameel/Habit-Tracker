/**
 * Performance budget violation banner component
 * Shows developer-only warnings when performance budgets are breached
 *
 * @fileoverview Budget violation banner for performance monitoring
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { useState, useEffect, useCallback } from 'react';

/**
 * Performance budget violation information
 */
export interface BudgetViolation {
  /**
   * The metric that was violated
   */
  metric: string;

  /**
   * The budget threshold
   */
  threshold: number;

  /**
   * The actual measured value
   */
  actual: number;

  /**
   * Severity of the violation
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Timestamp when violation occurred
   */
  timestamp: number;

  /**
   * Number of times this metric has been violated
   */
  count: number;

  /**
   * URL where violation occurred
   */
  url?: string;

  /**
   * Additional context about the violation
   */
  context?: Record<string, unknown>;
}

/**
 * Budget violation banner props
 */
export interface BudgetViolationBannerProps {
  /**
   * Array of current violations
   */
  violations: BudgetViolation[];

  /**
   * Callback when banner is dismissed
   */
  onDismiss?: (violationIds: string[]) => void;

  /**
   * Callback when violation is acknowledged
   */
  onAcknowledge?: (violationIds: string[]) => void;

  /**
   * Whether to show the banner automatically
   */
  autoShow?: boolean;

  /**
   * Maximum number of violations to show
   */
  maxViolations?: number;

  /**
   * Whether to show detailed information
   */
  showDetails?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Custom styles
   */
  style?: React.CSSProperties;
}

/**
 * Format metric value for display
 */
function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'LCP':
    case 'FID':
    case 'INP':
    case 'TBT':
      return `${value.toFixed(0)}ms`;
    case 'CLS':
      return value.toFixed(3);
    case 'bundle-size':
      if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)}MB`;
      } else if (value >= 1024) {
        return `${(value / 1024).toFixed(1)}KB`;
      }
      return `${value}B`;
    default:
      return value.toString();
  }
}

/**
 * Get severity color
 */
function getSeverityColor(severity: BudgetViolation['severity']): string {
  switch (severity) {
    case 'low':
      return '#f59e0b'; // amber
    case 'medium':
      return '#ef4444'; // red
    case 'high':
      return '#dc2626'; // darker red
    case 'critical':
      return '#991b1b'; // darkest red
    default:
      return '#6b7280'; // gray
  }
}

function getSeverityColorClass(severity: BudgetViolation['severity']): string {
  switch (severity) {
    case 'low':
      return 'bg-amber-500 text-white';
    case 'medium':
      return 'bg-rose-500 text-white';
    case 'high':
      return 'bg-rose-600 text-white';
    case 'critical':
      return 'bg-rose-700 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: BudgetViolation['severity']): string {
  switch (severity) {
    case 'low':
      return '!';
    case 'medium':
      return '!!';
    case 'high':
      return '!!!';
    case 'critical':
      return '!!!';
    default:
      return '!';
  }
}

/**
 * Budget Violation Banner Component
 *
 * @example
 * <BudgetViolationBanner
 *   violations={violations}
 *   onDismiss={(ids) => console.log('Dismissed:', ids)}
 *   onAcknowledge={(ids) => console.log('Acknowledged:', ids)}
 * />
 */
export const BudgetViolationBanner: React.FC<BudgetViolationBannerProps> = ({
  violations,
  onDismiss,
  onAcknowledge,
  autoShow = true,
  maxViolations = 5,
  showDetails = false,
  className,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(autoShow && violations.length > 0);
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(showDetails);

  // Show/hide banner based on violations
  useEffect(() => {
    setIsVisible(autoShow && violations.length > 0);
  }, [autoShow, violations]);

  // Auto-hide after 30 seconds if no interaction
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = setTimeout(() => {
      if (selectedViolations.size === 0) {
        setIsVisible(false);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isVisible, selectedViolations]);

  const handleDismiss = useCallback(() => {
    const dismissedIds =
      selectedViolations.size > 0
        ? Array.from(selectedViolations)
        : violations.map((v) => `${v.metric}-${v.timestamp}`);

    onDismiss?.(dismissedIds);
    setIsVisible(false);
    setSelectedViolations(new Set());
  }, [selectedViolations, violations, onDismiss]);

  const handleAcknowledge = useCallback(() => {
    const acknowledgedIds =
      selectedViolations.size > 0
        ? Array.from(selectedViolations)
        : violations.map((v) => `${v.metric}-${v.timestamp}`);

    onAcknowledge?.(acknowledgedIds);
    setSelectedViolations(new Set());
  }, [selectedViolations, violations, onAcknowledge]);

  const handleToggleSelection = useCallback((violationId: string) => {
    setSelectedViolations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  }, []);

  const handleToggleExpand = useCallback((violationId: string) => {
    setExpandedViolation((prev) => (prev === violationId ? null : violationId));
  }, []);

  const getViolationId = useCallback((violation: BudgetViolation) => {
    return `${violation.metric}-${violation.timestamp}`;
  }, []);

  if (!isVisible || violations.length === 0) {
    return null;
  }

  const displayViolations = violations.slice(0, maxViolations);
  const hasMoreViolations = violations.length > maxViolations;
  const allSelected = selectedViolations.size === displayViolations.length;
  const someSelected =
    selectedViolations.size > 0 && selectedViolations.size < displayViolations.length;

  return (
    <div
      className={`budget-violation-banner fixed top-5 right-5 max-w-md w-full bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-500 dark:border-rose-400 rounded-xl shadow-2xl z-50 ${className || ''}`}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-rose-200 dark:border-rose-700">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold">
            !
          </div>
          <div>
            <h3 className="m-0 text-base font-semibold text-rose-900 dark:text-rose-100">
              Performance Budget Violations
            </h3>
            <p className="m-1 mt-1 text-sm text-rose-700 dark:text-rose-200">
              {violations.length} violation{violations.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAllDetails(!showAllDetails)}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {showAllDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Violations List */}
      <div className="max-h-96 overflow-y-auto">
        {displayViolations.map((violation) => {
          const violationId = getViolationId(violation);
          const isSelected = selectedViolations.has(violationId);
          const isExpanded = expandedViolation === violationId;
          const severityColorClass = getSeverityColorClass(violation.severity);

          return (
            <div
              key={violationId}
              className={`p-3 border-b border-rose-200 dark:border-rose-700 cursor-pointer transition-colors ${
                isSelected ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-transparent'
              }`}
              onClick={() => handleToggleSelection(violationId)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelection(violationId)}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold ${severityColorClass}`}
                    >
                      {violation.severity.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm">{violation.metric}</span>
                    <span className="text-rose-700 dark:text-rose-300 text-sm">
                      {formatMetricValue(violation.metric, violation.actual)} /{' '}
                      {formatMetricValue(violation.metric, violation.threshold)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Violated {violation.count} time{violation.count !== 1 ? 's' : ''}
                    {violation.url && (
                      <span className="ml-2">on {new URL(violation.url).pathname}</span>
                    )}
                  </div>

                  {(showAllDetails || isExpanded) && violation.context && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpand(violationId);
                        }}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'Show'} Context
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-xs font-mono">
                          {Object.entries(violation.context).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`w-4 h-4 rounded-full ${severityColorClass} flex items-center justify-center text-xs font-bold`}
                >
                  {getSeverityIcon(violation.severity)}
                </div>
              </div>
            </div>
          );
        })}

        {hasMoreViolations && (
          <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
            ... and {violations.length - maxViolations} more violations
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 border-t border-rose-200 dark:border-rose-700">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = someSelected;
              }
            }}
            onChange={() => {
              if (allSelected || someSelected) {
                setSelectedViolations(new Set());
              } else {
                setSelectedViolations(new Set(displayViolations.map(getViolationId)));
              }
            }}
            className="cursor-pointer"
          />
          <span className="text-sm">
            {allSelected
              ? 'All selected'
              : someSelected
                ? `${selectedViolations.size} selected`
                : 'Select all'}
          </span>
        </div>

        <div className="flex gap-2">
          {someSelected && (
            <button
              onClick={handleAcknowledge}
              className="px-3 py-1.5 border border-emerald-600 rounded bg-emerald-600 text-white text-xs cursor-pointer hover:bg-emerald-700 transition-colors"
            >
              Acknowledge Selected
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 border border-indigo-600 rounded bg-indigo-600 text-white text-xs cursor-pointer hover:bg-indigo-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing budget violations
 */
export function useBudgetViolationBanner() {
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

  const addViolation = useCallback((violation: Omit<BudgetViolation, 'timestamp' | 'count'>) => {
    setViolations((prev) => {
      const existing = prev.find((v) => v.metric === violation.metric);
      if (existing) {
        return prev.map((v) =>
          v.metric === violation.metric
            ? { ...v, ...violation, count: v.count + 1, timestamp: Date.now() }
            : v
        );
      }
      return [...prev, { ...violation, timestamp: Date.now(), count: 1 }];
    });
  }, []);

  const removeViolation = useCallback((metric: string) => {
    setViolations((prev) => prev.filter((v) => v.metric !== metric));
  }, []);

  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  const dismissViolation = useCallback((violationId: string) => {
    setDismissedViolations((prev) => new Set([...prev, violationId]));
  }, []);

  const acknowledgeViolation = useCallback((violationId: string) => {
    setDismissedViolations((prev) => new Set([...prev, violationId]));
    // Optionally remove acknowledged violations from active list
    setViolations((prev) => prev.filter((v) => `${v.metric}-${v.timestamp}` !== violationId));
  }, []);

  const activeViolations = violations.filter(
    (v) => !dismissedViolations.has(`${v.metric}-${v.timestamp}`)
  );

  return {
    violations: activeViolations,
    allViolations: violations,
    addViolation,
    removeViolation,
    clearViolations,
    dismissViolation,
    acknowledgeViolation,
    dismissedCount: dismissedViolations.size,
  };
}

/**
 * Performance budget alert component for inline usage
 */
export const PerformanceAlert: React.FC<{
  violation: BudgetViolation;
  onDismiss?: () => void;
  compact?: boolean;
}> = ({ violation, onDismiss, compact = false }) => {
  const _severityColor = getSeverityColor(violation.severity);

  if (compact) {
    const severityColorClass = getSeverityColorClass(violation.severity);
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 rounded text-xs text-rose-900 dark:text-rose-100">
        <span className={`font-bold ${severityColorClass}`}>
          {violation.severity.toUpperCase()}
        </span>
        <span>
          {violation.metric}: {formatMetricValue(violation.metric, violation.actual)}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="bg-transparent border-none text-slate-500 cursor-pointer p-0 text-sm hover:text-slate-700 dark:hover:text-slate-300"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const severityColorClass = getSeverityColorClass(violation.severity);
  return (
    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 rounded-lg mx-0 my-2">
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full ${severityColorClass} text-white flex items-center justify-center text-xs font-bold`}
        >
          !
        </div>

        <div className="flex-1">
          <div className="font-semibold text-sm text-rose-900 dark:text-rose-100">
            {violation.metric} Budget Violation
          </div>
          <div className="text-sm text-rose-700 dark:text-rose-300 mt-0.5">
            {formatMetricValue(violation.metric, violation.actual)} exceeds budget of{' '}
            {formatMetricValue(violation.metric, violation.threshold)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Severity: {violation.severity} | Violated {violation.count} times
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="bg-transparent border-none text-slate-500 cursor-pointer text-base p-1 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
