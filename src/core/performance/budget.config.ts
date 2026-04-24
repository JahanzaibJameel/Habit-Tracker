/**
 * Performance budget configuration
 * Defines quantitative limits for application performance metrics
 * 
 * @fileoverview Performance budget thresholds and limits
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

export interface PerformanceBudget {
  // Bundle size limits (in bytes)
  bundleSize: {
    total: number;
    chunks: Record<string, number>;
    gzip: {
      total: number;
      chunks: Record<string, number>;
    };
  };
  
  // Runtime performance limits
  runtime: {
    // Core Web Vitals
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    inp: number; // Interaction to Next Paint (ms)
    tbt: number; // Total Blocking Time (ms)
    
    // Custom metrics
    timeToHydration: number; // Time to React hydration (ms)
    timeToFirstMeaningfulPaint: number; // Time to first meaningful paint (ms)
    timeToInteractive: number; // Time to interactive (ms)
    firstContentfulPaint: number; // First Contentful Paint (ms)
  };
  
  // Resource limits
  resources: {
    maxRequests: number;
    maxTotalSize: number; // bytes
    maxImageSize: number; // bytes
    maxScriptSize: number; // bytes
    maxCssSize: number; // bytes
    maxFontSize: number; // bytes
  };
  
  // Memory limits
  memory: {
    maxHeapSize: number; // MB
    maxJsHeapSize: number; // MB
    maxDomNodes: number;
    maxEventListeners: number;
  };
  
  // Network limits
  network: {
    maxLatency: number; // ms
    maxDnsLookup: number; // ms
    maxTtfb: number; // Time to First Byte (ms)
    maxDownloadTime: number; // ms
  };
  
  // Animation performance
  animation: {
    minFps: number;
    maxFrameTime: number; // ms
    maxDroppedFrames: number; // per second
  };
}

/**
 * Default performance budgets for different environments
 */
export const DefaultBudgets: Record<string, PerformanceBudget> = {
  // Production budget - strict limits
  production: {
    bundleSize: {
      total: 250 * 1024, // 250KB
      chunks: {
        vendor: 100 * 1024, // 100KB
        main: 50 * 1024, // 50KB
        common: 30 * 1024, // 30KB
        styles: 20 * 1024, // 20KB
      },
      gzip: {
        total: 70 * 1024, // 70KB gzipped
        chunks: {
          vendor: 30 * 1024, // 30KB
          main: 15 * 1024, // 15KB
          common: 10 * 1024, // 10KB
          styles: 8 * 1024, // 8KB
        },
      },
    },
    
    runtime: {
      lcp: 2500, // 2.5s
      fid: 100, // 100ms
      cls: 0.1,
      inp: 200, // 200ms
      tbt: 300, // 300ms
      timeToHydration: 1500, // 1.5s
      timeToFirstMeaningfulPaint: 2000, // 2s
      timeToInteractive: 3800, // 3.8s
      firstContentfulPaint: 1800, // 1.8s
    },
    
    resources: {
      maxRequests: 50,
      maxTotalSize: 1024 * 1024, // 1MB
      maxImageSize: 500 * 1024, // 500KB
      maxScriptSize: 250 * 1024, // 250KB
      maxCssSize: 100 * 1024, // 100KB
      maxFontSize: 50 * 1024, // 50KB
    },
    
    memory: {
      maxHeapSize: 50, // 50MB
      maxJsHeapSize: 30, // 30MB
      maxDomNodes: 1500,
      maxEventListeners: 1000,
    },
    
    network: {
      maxLatency: 500, // 500ms
      maxDnsLookup: 100, // 100ms
      maxTtfb: 600, // 600ms
      maxDownloadTime: 1000, // 1s
    },
    
    animation: {
      minFps: 60,
      maxFrameTime: 16.67, // 60fps = 16.67ms per frame
      maxDroppedFrames: 2,
    },
  },
  
  // Development budget - more lenient for debugging
  development: {
    bundleSize: {
      total: 500 * 1024, // 500KB
      chunks: {
        vendor: 200 * 1024, // 200KB
        main: 100 * 1024, // 100KB
        common: 50 * 1024, // 50KB
        styles: 40 * 1024, // 40KB
      },
      gzip: {
        total: 150 * 1024, // 150KB gzipped
        chunks: {
          vendor: 60 * 1024, // 60KB
          main: 30 * 1024, // 30KB
          common: 20 * 1024, // 20KB
          styles: 15 * 1024, // 15KB
        },
      },
    },
    
    runtime: {
      lcp: 4000, // 4s
      fid: 200, // 200ms
      cls: 0.25,
      inp: 400, // 400ms
      tbt: 600, // 600ms
      timeToHydration: 3000, // 3s
      timeToFirstMeaningfulPaint: 4000, // 4s
      timeToInteractive: 7000, // 7s
      firstContentfulPaint: 3000, // 3s
    },
    
    resources: {
      maxRequests: 100,
      maxTotalSize: 2 * 1024 * 1024, // 2MB
      maxImageSize: 1024 * 1024, // 1MB
      maxScriptSize: 500 * 1024, // 500KB
      maxCssSize: 200 * 1024, // 200KB
      maxFontSize: 100 * 1024, // 100KB
    },
    
    memory: {
      maxHeapSize: 100, // 100MB
      maxJsHeapSize: 60, // 60MB
      maxDomNodes: 3000,
      maxEventListeners: 2000,
    },
    
    network: {
      maxLatency: 1000, // 1s
      maxDnsLookup: 200, // 200ms
      maxTtfb: 1200, // 1.2s
      maxDownloadTime: 2000, // 2s
    },
    
    animation: {
      minFps: 30,
      maxFrameTime: 33.33, // 30fps = 33.33ms per frame
      maxDroppedFrames: 5,
    },
  },
  
  // Testing budget - very lenient
  testing: {
    bundleSize: {
      total: 1024 * 1024, // 1MB
      chunks: {
        vendor: 500 * 1024, // 500KB
        main: 200 * 1024, // 200KB
        common: 100 * 1024, // 100KB
        styles: 80 * 1024, // 80KB
      },
      gzip: {
        total: 300 * 1024, // 300KB gzipped
        chunks: {
          vendor: 150 * 1024, // 150KB
          main: 60 * 1024, // 60KB
          common: 40 * 1024, // 40KB
          styles: 30 * 1024, // 30KB
        },
      },
    },
    
    runtime: {
      lcp: 10000, // 10s
      fid: 500, // 500ms
      cls: 0.5,
      inp: 1000, // 1s
      tbt: 2000, // 2s
      timeToHydration: 10000, // 10s
      timeToFirstMeaningfulPaint: 10000, // 10s
      timeToInteractive: 15000, // 15s
      firstContentfulPaint: 8000, // 8s
    },
    
    resources: {
      maxRequests: 200,
      maxTotalSize: 5 * 1024 * 1024, // 5MB
      maxImageSize: 2 * 1024 * 1024, // 2MB
      maxScriptSize: 1024 * 1024, // 1MB
      maxCssSize: 500 * 1024, // 500KB
      maxFontSize: 200 * 1024, // 200KB
    },
    
    memory: {
      maxHeapSize: 200, // 200MB
      maxJsHeapSize: 120, // 120MB
      maxDomNodes: 6000,
      maxEventListeners: 4000,
    },
    
    network: {
      maxLatency: 2000, // 2s
      maxDnsLookup: 500, // 500ms
      maxTtfb: 2500, // 2.5s
      maxDownloadTime: 5000, // 5s
    },
    
    animation: {
      minFps: 15,
      maxFrameTime: 66.67, // 15fps = 66.67ms per frame
      maxDroppedFrames: 10,
    },
  },
};

/**
 * Performance budget configuration interface
 */
export interface BudgetConfig {
  environment: keyof typeof DefaultBudgets;
  customBudget?: Partial<PerformanceBudget>;
  enableWarnings: boolean;
  enableStrictMode: boolean;
  enableReporting: boolean;
  breachThreshold: number; // Number of breaches before action
  samplingRate: number; // 0-1, percentage of sessions to monitor
}

/**
 * Default budget configuration
 */
export const DefaultBudgetConfig: BudgetConfig = {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 
              process.env.NODE_ENV === 'test' ? 'testing' : 'development',
  enableWarnings: true,
  enableStrictMode: process.env.NODE_ENV === 'production',
  enableReporting: process.env.NODE_ENV === 'production',
  breachThreshold: 3, // Alert after 3 breaches
  samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production
};

/**
 * Get effective budget for current environment
 */
export function getEffectiveBudget(config: BudgetConfig): PerformanceBudget {
  const baseBudget = DefaultBudgets[config.environment];
  
  if (config.customBudget) {
    return mergeBudgets(baseBudget, config.customBudget);
  }
  
  return baseBudget;
}

/**
 * Deep merge two budget objects
 */
function mergeBudgets(base: PerformanceBudget, override: Partial<PerformanceBudget>): PerformanceBudget {
  const merged = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // @ts-ignore - Dynamic deep merge
      merged[key] = { ...base[key as keyof PerformanceBudget], ...value };
    } else {
      // @ts-ignore - Direct assignment for primitive values
      merged[key] = value;
    }
  }
  
  return merged;
}

/**
 * Budget validation rules
 */
export const BudgetValidationRules = {
  // Bundle size validation
  validateBundleSize: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },
  
  // Runtime performance validation
  validateRuntimeMetric: (actual: number, budget: number, metric: string): boolean => {
    // For CLS, lower is better
    if (metric === 'cls') {
      return actual <= budget;
    }
    // For time-based metrics, lower is better
    return actual <= budget;
  },
  
  // Memory validation
  validateMemoryUsage: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },
  
  // Network validation
  validateNetworkMetric: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },
  
  // Animation validation
  validateAnimationPerformance: (actual: number, budget: number, metric: string): boolean => {
    if (metric === 'minFps') {
      return actual >= budget; // Higher FPS is better
    }
    return actual <= budget; // Lower time is better
  },
};

/**
 * Budget breach severity levels
 */
export enum BudgetBreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Get breach severity based on how much the budget is exceeded
 */
export function getBreachSeverity(actual: number, budget: number): BudgetBreachSeverity {
  const ratio = actual / budget;
  
  if (ratio <= 1) return BudgetBreachSeverity.LOW;
  if (ratio <= 1.25) return BudgetBreachSeverity.MEDIUM;
  if (ratio <= 1.5) return BudgetBreachSeverity.HIGH;
  return BudgetBreachSeverity.CRITICAL;
}

/**
 * Performance budget categories for reporting
 */
export const BudgetCategories = {
  BUNDLE_SIZE: 'bundleSize',
  RUNTIME_PERFORMANCE: 'runtime',
  RESOURCES: 'resources',
  MEMORY: 'memory',
  NETWORK: 'network',
  ANIMATION: 'animation',
} as const;

export type BudgetCategory = typeof BudgetCategories[keyof typeof BudgetCategories];
