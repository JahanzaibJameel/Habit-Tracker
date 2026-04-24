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
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (selectedViolations.size === 0) {
        setIsVisible(false);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isVisible, selectedViolations]);

  const handleDismiss = useCallback(() => {
    const dismissedIds = selectedViolations.size > 0 
      ? Array.from(selectedViolations)
      : violations.map(v => `${v.metric}-${v.timestamp}`);

    onDismiss?.(dismissedIds);
    setIsVisible(false);
    setSelectedViolations(new Set());
  }, [selectedViolations, violations, onDismiss]);

  const handleAcknowledge = useCallback(() => {
    const acknowledgedIds = selectedViolations.size > 0 
      ? Array.from(selectedViolations)
      : violations.map(v => `${v.metric}-${v.timestamp}`);

    onAcknowledge?.(acknowledgedIds);
    setSelectedViolations(new Set());
  }, [selectedViolations, violations, onAcknowledge]);

  const handleToggleSelection = useCallback((violationId: string) => {
    setSelectedViolations(prev => {
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
    setExpandedViolation(prev => prev === violationId ? null : violationId);
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
  const someSelected = selectedViolations.size > 0 && selectedViolations.size < displayViolations.length;

  return (
    <div 
      className={`budget-violation-banner ${className || ''}`}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#fef2f2',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        ...style,
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #fecaca',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            !
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#991b1b' }}>
              Performance Budget Violations
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
              {violations.length} violation{violations.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowAllDetails(!showAllDetails)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {showAllDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Violations List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {displayViolations.map((violation) => {
          const violationId = getViolationId(violation);
          const isSelected = selectedViolations.has(violationId);
          const isExpanded = expandedViolation === violationId;
          const severityColor = getSeverityColor(violation.severity);

          return (
            <div
              key={violationId}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #fecaca',
                backgroundColor: isSelected ? '#fee2e2' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onClick={() => handleToggleSelection(violationId)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelection(violationId)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer' }}
                />
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: severityColor,
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '600',
                      }}
                    >
                      {violation.severity.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                      {violation.metric}
                    </span>
                    <span style={{ color: '#7f1d1d', fontSize: '14px' }}>
                      {formatMetricValue(violation.metric, violation.actual)} / {formatMetricValue(violation.metric, violation.threshold)}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Violated {violation.count} time{violation.count !== 1 ? 's' : ''}
                    {violation.url && (
                      <span style={{ marginLeft: '8px' }}>
                        on {new URL(violation.url).pathname}
                      </span>
                    )}
                  </div>
                  
                  {(showAllDetails || isExpanded) && violation.context && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpand(violationId);
                        }}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? 'Hide' : 'Show'} Context
                      </button>
                      
                      {isExpanded && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}>
                          {Object.entries(violation.context).map(([key, value]) => (
                            <div key={key} style={{ marginBottom: '4px' }}>
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div 
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: severityColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  {getSeverityIcon(violation.severity)}
                </div>
              </div>
            </div>
          );
        })}
        
        {hasMoreViolations && (
          <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
            ... and {violations.length - maxViolations} more violations
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          borderTop: '1px solid #fecaca',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={() => {
              if (allSelected || someSelected) {
                setSelectedViolations(new Set());
              } else {
                setSelectedViolations(new Set(displayViolations.map(getViolationId)));
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '14px' }}>
            {allSelected ? 'All selected' : someSelected ? `${selectedViolations.size} selected` : 'Select all'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {someSelected && (
            <button
              onClick={handleAcknowledge}
              style={{
                padding: '6px 12px',
                border: '1px solid #10b981',
                borderRadius: '4px',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Acknowledge Selected
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '6px 12px',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
            }}
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
    setViolations(prev => {
      const existing = prev.find(v => v.metric === violation.metric);
      if (existing) {
        return prev.map(v => 
          v.metric === violation.metric 
            ? { ...v, ...violation, count: v.count + 1, timestamp: Date.now() }
            : v
        );
      }
      return [...prev, { ...violation, timestamp: Date.now(), count: 1 }];
    });
  }, []);

  const removeViolation = useCallback((metric: string) => {
    setViolations(prev => prev.filter(v => v.metric !== metric));
  }, []);

  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  const dismissViolation = useCallback((violationId: string) => {
    setDismissedViolations(prev => new Set([...prev, violationId]));
  }, []);

  const acknowledgeViolation = useCallback((violationId: string) => {
    setDismissedViolations(prev => new Set([...prev, violationId]));
    // Optionally remove acknowledged violations from active list
    setViolations(prev => prev.filter(v => `${v.metric}-${v.timestamp}` !== violationId));
  }, []);

  const activeViolations = violations.filter(v => !dismissedViolations.has(`${v.metric}-${v.timestamp}`));

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
  const severityColor = getSeverityColor(violation.severity);

  if (compact) {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          backgroundColor: '#fef2f2',
          border: `1px solid ${severityColor}`,
          borderRadius: '4px',
          fontSize: '12px',
          color: '#991b1b',
        }}
      >
        <span style={{ color: severityColor, fontWeight: 'bold' }}>
          {violation.severity.toUpperCase()}
        </span>
        <span>{violation.metric}: {formatMetricValue(violation.metric, violation.actual)}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0',
              fontSize: '14px',
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      style={{
        padding: '12px',
        backgroundColor: '#fef2f2',
        border: `1px solid ${severityColor}`,
        borderRadius: '6px',
        margin: '8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: severityColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          !
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#991b1b' }}>
            {violation.metric} Budget Violation
          </div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '2px' }}>
            {formatMetricValue(violation.metric, violation.actual)} exceeds budget of {formatMetricValue(violation.metric, violation.threshold)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Severity: {violation.severity} | Violated {violation.count} times
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
