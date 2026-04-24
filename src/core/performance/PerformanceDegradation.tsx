/**
 * Performance degradation system for budget breaches
 * Automatically degrades non-critical features when performance budgets are breached
 * 
 * @fileoverview Performance degradation with automatic feature management
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { PerformanceBreach } from './PerformanceMonitor';
import { BudgetBreachSeverity } from './budget.config';

/**
 * Performance degradation levels
 */
export enum DegradationLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical',
}

/**
 * Feature categories for degradation
 */
export enum FeatureCategory {
  ANIMATIONS = 'animations',
  IMAGES = 'images',
  VIDEOS = 'videos',
  THIRD_PARTY = 'third_party',
  ANALYTICS = 'analytics',
  AUTO_REFRESH = 'auto_refresh',
  BACKGROUND_TASKS = 'background_tasks',
  HEAVY_COMPUTATIONS = 'heavy_computations',
  NETWORK_REQUESTS = 'network_requests',
  UI_POLISH = 'ui_polish',
}

/**
 * Feature definition for degradation
 */
export interface Feature {
  id: string;
  name: string;
  category: FeatureCategory;
  priority: number; // 1-10, higher = more important
  description: string;
  impact: string; // What happens when degraded
}

/**
 * Degradation rule
 */
export interface DegradationRule {
  severity: BudgetBreachSeverity;
  level: DegradationLevel;
  features: FeatureCategory[];
  description: string;
  duration?: number; // How long to maintain degradation (ms)
}

/**
 * Performance degradation state
 */
export interface PerformanceDegradationState {
  currentLevel: DegradationLevel;
  activeBreaches: PerformanceBreach[];
  degradedFeatures: Set<string>;
  enabledFeatures: Set<string>;
  lastBreachTime: number;
  isDegraded: boolean;
  rules: DegradationRule[];
}

/**
 * Performance degradation actions
 */
export type PerformanceDegradationAction =
  | { type: 'BREACH_DETECTED'; payload: PerformanceBreach }
  | { type: 'BREACH_RESOLVED'; payload: string }
  | { type: 'SET_DEGRADATION_LEVEL'; payload: DegradationLevel }
  | { type: 'ENABLE_FEATURE'; payload: string }
  | { type: 'DISABLE_FEATURE'; payload: string }
  | { type: 'RESET_DEGRADATION' }
  | { type: 'UPDATE_RULES'; payload: DegradationRule[] };

/**
 * Default features that can be degraded
 */
export const DEFAULT_FEATURES: Feature[] = [
  {
    id: 'css-animations',
    name: 'CSS Animations',
    category: FeatureCategory.ANIMATIONS,
    priority: 3,
    description: 'CSS transitions and animations',
    impact: 'Animations are disabled, UI becomes static',
  },
  {
    id: 'js-animations',
    name: 'JavaScript Animations',
    category: FeatureCategory.ANIMATIONS,
    priority: 2,
    description: 'JavaScript-powered animations',
    impact: 'Complex animations are disabled',
  },
  {
    id: 'high-res-images',
    name: 'High Resolution Images',
    category: FeatureCategory.IMAGES,
    priority: 4,
    description: 'High resolution and retina images',
    impact: 'Images load in lower quality',
  },
  {
    id: 'lazy-images',
    name: 'Lazy Image Loading',
    category: FeatureCategory.IMAGES,
    priority: 6,
    description: 'Lazy loading of images below fold',
    impact: 'All images load immediately',
  },
  {
    id: 'auto-play-videos',
    name: 'Auto-play Videos',
    category: FeatureCategory.VIDEOS,
    priority: 2,
    description: 'Automatic video playback',
    impact: 'Videos require user interaction to play',
  },
  {
    id: 'video-quality',
    name: 'Video Quality',
    category: FeatureCategory.VIDEOS,
    priority: 3,
    description: 'High definition video streaming',
    impact: 'Videos stream in lower quality',
  },
  {
    id: 'third-party-scripts',
    name: 'Third-party Scripts',
    category: FeatureCategory.THIRD_PARTY,
    priority: 1,
    description: 'Non-essential third-party integrations',
    impact: 'Social widgets, analytics, etc. are disabled',
  },
  {
    id: 'analytics',
    name: 'Analytics Tracking',
    category: FeatureCategory.ANALYTICS,
    priority: 5,
    description: 'User behavior analytics',
    impact: 'Analytics events are not tracked',
  },
  {
    id: 'auto-refresh',
    name: 'Auto-refresh Data',
    category: FeatureCategory.AUTO_REFRESH,
    priority: 4,
    description: 'Automatic data refresh intervals',
    impact: 'Data refreshes become manual',
  },
  {
    id: 'background-sync',
    name: 'Background Synchronization',
    category: FeatureCategory.BACKGROUND_TASKS,
    priority: 3,
    description: 'Background data synchronization',
    impact: 'Sync only happens when app is active',
  },
  {
    id: 'heavy-computations',
    name: 'Heavy Computations',
    category: FeatureCategory.HEAVY_COMPUTATIONS,
    priority: 2,
    description: 'Complex calculations and processing',
    impact: 'Heavy computations are simplified or deferred',
  },
  {
    id: 'network-polling',
    name: 'Network Polling',
    category: FeatureCategory.NETWORK_REQUESTS,
    priority: 3,
    description: 'Regular network requests for updates',
    impact: 'Network requests are reduced in frequency',
  },
  {
    id: 'ui-polish',
    name: 'UI Polish Effects',
    category: FeatureCategory.UI_POLISH,
    priority: 7,
    description: 'Visual effects, hover states, micro-interactions',
    impact: 'UI becomes more basic and functional',
  },
];

/**
 * Default degradation rules
 */
export const DEFAULT_DEGRADATION_RULES: DegradationRule[] = [
  {
    severity: BudgetBreachSeverity.LOW,
    level: DegradationLevel.MINIMAL,
    features: [FeatureCategory.UI_POLISH],
    description: 'Minor performance issues - disabling visual polish',
    duration: 300000, // 5 minutes
  },
  {
    severity: BudgetBreachSeverity.MEDIUM,
    level: DegradationLevel.MODERATE,
    features: [FeatureCategory.ANIMATIONS, FeatureCategory.AUTO_REFRESH],
    description: 'Moderate performance issues - disabling animations and auto-refresh',
    duration: 600000, // 10 minutes
  },
  {
    severity: BudgetBreachSeverity.HIGH,
    level: DegradationLevel.SEVERE,
    features: [FeatureCategory.IMAGES, FeatureCategory.VIDEOS, FeatureCategory.THIRD_PARTY],
    description: 'Severe performance issues - disabling media and third-party scripts',
    duration: 900000, // 15 minutes
  },
  {
    severity: BudgetBreachSeverity.CRITICAL,
    level: DegradationLevel.CRITICAL,
    features: [
      FeatureCategory.ANALYTICS,
      FeatureCategory.BACKGROUND_TASKS,
      FeatureCategory.HEAVY_COMPUTATIONS,
      FeatureCategory.NETWORK_REQUESTS,
    ],
    description: 'Critical performance issues - disabling all non-essential features',
    duration: 1200000, // 20 minutes
  },
];

/**
 * Performance degradation reducer
 */
function performanceDegradationReducer(
  state: PerformanceDegradationState,
  action: PerformanceDegradationAction
): PerformanceDegradationState {
  switch (action.type) {
    case 'BREACH_DETECTED': {
      const breach = action.payload;
      const rule = state.rules.find(r => r.severity === breach.severity);
      
      if (!rule) {
        return state;
      }

      const newLevel = rule.level;
      const featuresToDisable = DEFAULT_FEATURES
        .filter(f => rule.features.includes(f.category))
        .map(f => f.id);

      return {
        ...state,
        currentLevel: newLevel,
        activeBreaches: [...state.activeBreaches, breach],
        lastBreachTime: Date.now(),
        degradedFeatures: new Set([...state.degradedFeatures, ...featuresToDisable]),
        enabledFeatures: new Set(
          DEFAULT_FEATURES
            .filter(f => !featuresToDisable.includes(f.id))
            .map(f => f.id)
        ),
        isDegraded: true,
      };
    }

    case 'BREACH_RESOLVED': {
      const breachId = action.payload;
      const activeBreaches = state.activeBreaches.filter(b => b.metric !== breachId);
      
      if (activeBreaches.length === 0) {
        // All breaches resolved, restore all features
        return {
          ...state,
          currentLevel: DegradationLevel.NONE,
          activeBreaches: [],
          degradedFeatures: new Set(),
          enabledFeatures: new Set(DEFAULT_FEATURES.map(f => f.id)),
          isDegraded: false,
        };
      }

      // Recalculate degradation level based on remaining breaches
      const highestSeverity = Math.max(...activeBreaches.map(b => b.severity));
      const rule = state.rules.find(r => r.severity === highestSeverity);
      
      if (rule) {
        const featuresToDisable = DEFAULT_FEATURES
          .filter(f => rule.features.includes(f.category))
          .map(f => f.id);

        return {
          ...state,
          currentLevel: rule.level,
          activeBreaches,
          degradedFeatures: new Set(featuresToDisable),
          enabledFeatures: new Set(
            DEFAULT_FEATURES
              .filter(f => !featuresToDisable.includes(f.id))
              .map(f => f.id)
          ),
        };
      }

      return state;
    }

    case 'SET_DEGRADATION_LEVEL': {
      const level = action.payload;
      const rule = state.rules.find(r => r.level === level);
      
      if (!rule) {
        return state;
      }

      const featuresToDisable = DEFAULT_FEATURES
        .filter(f => rule.features.includes(f.category))
        .map(f => f.id);

      return {
        ...state,
        currentLevel: level,
        degradedFeatures: new Set(featuresToDisable),
        enabledFeatures: new Set(
          DEFAULT_FEATURES
            .filter(f => !featuresToDisable.includes(f.id))
            .map(f => f.id)
        ),
        isDegraded: level !== DegradationLevel.NONE,
      };
    }

    case 'ENABLE_FEATURE': {
      const featureId = action.payload;
      const newDegraded = new Set(state.degradedFeatures);
      newDegraded.delete(featureId);
      const newEnabled = new Set(state.enabledFeatures);
      newEnabled.add(featureId);

      return {
        ...state,
        degradedFeatures: newDegraded,
        enabledFeatures: newEnabled,
      };
    }

    case 'DISABLE_FEATURE': {
      const featureId = action.payload;
      const newDegraded = new Set(state.degradedFeatures);
      newDegraded.add(featureId);
      const newEnabled = new Set(state.enabledFeatures);
      newEnabled.delete(featureId);

      return {
        ...state,
        degradedFeatures: newDegraded,
        enabledFeatures: newEnabled,
      };
    }

    case 'RESET_DEGRADATION': {
      return {
        ...state,
        currentLevel: DegradationLevel.NONE,
        activeBreaches: [],
        degradedFeatures: new Set(),
        enabledFeatures: new Set(DEFAULT_FEATURES.map(f => f.id)),
        lastBreachTime: 0,
        isDegraded: false,
      };
    }

    case 'UPDATE_RULES': {
      return {
        ...state,
        rules: action.payload,
      };
    }

    default:
      return state;
  }
}

/**
 * Performance degradation context
 */
const PerformanceDegradationContext = createContext<{
  state: PerformanceDegradationState;
  actions: {
    reportBreach: (breach: PerformanceBreach) => void;
    resolveBreach: (metric: string) => void;
    setLevel: (level: DegradationLevel) => void;
    enableFeature: (featureId: string) => void;
    disableFeature: (featureId: string) => void;
    reset: () => void;
    isFeatureEnabled: (featureId: string) => boolean;
    isFeatureDegraded: (featureId: string) => boolean;
    getFeature: (featureId: string) => Feature | undefined;
    getFeaturesByCategory: (category: FeatureCategory) => Feature[];
  };
} | null>(null);

/**
 * Performance degradation provider
 */
export function PerformanceDegradationProvider({
  children,
  rules = DEFAULT_DEGRADATION_RULES,
}: {
  children: ReactNode;
  rules?: DegradationRule[];
}) {
  const [state, dispatch] = useReducer(performanceDegradationReducer, {
    currentLevel: DegradationLevel.NONE,
    activeBreaches: [],
    degradedFeatures: new Set(),
    enabledFeatures: new Set(DEFAULT_FEATURES.map(f => f.id)),
    lastBreachTime: 0,
    isDegraded: false,
    rules,
  });

  // Auto-recovery timer
  useEffect(() => {
    if (state.isDegraded && state.lastBreachTime > 0) {
      const activeRule = state.rules.find(r => r.level === state.currentLevel);
      const duration = activeRule?.duration;

      if (duration) {
        const timer = setTimeout(() => {
          dispatch({ type: 'RESET_DEGRADATION' });
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [state.currentLevel, state.lastBreachTime, state.rules]);

  const actions = {
    reportBreach: (breach: PerformanceBreach) => {
      dispatch({ type: 'BREACH_DETECTED', payload: breach });
    },

    resolveBreach: (metric: string) => {
      dispatch({ type: 'BREACH_RESOLVED', payload: metric });
    },

    setLevel: (level: DegradationLevel) => {
      dispatch({ type: 'SET_DEGRADATION_LEVEL', payload: level });
    },

    enableFeature: (featureId: string) => {
      dispatch({ type: 'ENABLE_FEATURE', payload: featureId });
    },

    disableFeature: (featureId: string) => {
      dispatch({ type: 'DISABLE_FEATURE', payload: featureId });
    },

    reset: () => {
      dispatch({ type: 'RESET_DEGRADATION' });
    },

    isFeatureEnabled: (featureId: string) => {
      return state.enabledFeatures.has(featureId);
    },

    isFeatureDegraded: (featureId: string) => {
      return state.degradedFeatures.has(featureId);
    },

    getFeature: (featureId: string) => {
      return DEFAULT_FEATURES.find(f => f.id === featureId);
    },

    getFeaturesByCategory: (category: FeatureCategory) => {
      return DEFAULT_FEATURES.filter(f => f.category === category);
    },
  };

  return (
    <PerformanceDegradationContext.Provider value={{ state, actions }}>
      {children}
    </PerformanceDegradationContext.Provider>
  );
}

/**
 * Hook to use performance degradation
 */
export function usePerformanceDegradation() {
  const context = useContext(PerformanceDegradationContext);
  
  if (!context) {
    throw new Error('usePerformanceDegradation must be used within a PerformanceDegradationProvider');
  }

  return context;
}

/**
 * Hook to conditionally render based on feature degradation
 */
export function useDegradedFeature(featureId: string) {
  const { actions } = usePerformanceDegradation();
  
  return {
    isEnabled: actions.isFeatureEnabled(featureId),
    isDegraded: actions.isFeatureDegraded(featureId),
    feature: actions.getFeature(featureId),
  };
}

/**
 * Component to conditionally render children based on feature degradation
 */
export function DegradedFeature({
  featureId,
  children,
  fallback = null,
}: {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isEnabled } = useDegradedFeature(featureId);
  
  return <>{isEnabled ? children : fallback}</>;
}

/**
 * Hook to apply CSS classes based on degradation level
 */
export function useDegradationClasses() {
  const { state } = usePerformanceDegradation();
  
  return {
    container: `performance-degradation-${state.currentLevel}`,
    animations: state.isFeatureEnabled('css-animations') ? '' : 'no-animations',
    images: state.isFeatureEnabled('high-res-images') ? '' : 'low-quality-images',
    videos: state.isFeatureEnabled('auto-play-videos') ? '' : 'no-auto-play',
    polish: state.isFeatureEnabled('ui-polish') ? '' : 'no-polish',
  };
}

/**
 * Performance degradation notification component
 */
export function PerformanceDegradationNotification() {
  const { state, actions } = usePerformanceDegradation();

  if (!state.isDegraded) {
    return null;
  }

  const activeRule = state.rules.find(r => r.level === state.currentLevel);
  
  return (
    <div
      className={`performance-degradation-notification ${state.currentLevel}`}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: state.currentLevel === DegradationLevel.CRITICAL ? '#dc3545' : '#ffc107',
        color: state.currentLevel === DegradationLevel.CRITICAL ? 'white' : 'black',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '300px',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
        Performance Mode
      </div>
      <div style={{ fontSize: '12px', marginBottom: '8px' }}>
        {activeRule?.description || 'Performance degradation active'}
      </div>
      <button
        onClick={actions.reset}
        style={{
          padding: '4px 8px',
          fontSize: '11px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        Restore Features
      </button>
    </div>
  );
}

/**
 * CSS for performance degradation
 */
export const PERFORMANCE_DEGRADATION_CSS = `
.performance-degradation-none {
  /* No degradation - full functionality */
}

.performance-degradation-minimal {
  /* Minimal degradation */
  .no-polish {
    transition: none !important;
    transform: none !important;
    animation: none !important;
  }
}

.performance-degradation-moderate {
  /* Moderate degradation */
  .no-animations {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

.performance-degradation-severe {
  /* Severe degradation */
  .low-quality-images img {
    filter: blur(2px);
    image-rendering: pixelated;
  }
  
  .no-auto-play video {
    pointer-events: none;
  }
  
  .no-animations {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

.performance-degradation-critical {
  /* Critical degradation */
  * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
  
  img {
    filter: grayscale(100%) blur(1px);
    image-rendering: pixelated;
  }
  
  video {
    display: none;
  }
}
`;
