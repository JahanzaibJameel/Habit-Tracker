export interface PerformanceBudget {
  bundleSize: {
    total: number;
    chunks: Record<string, number>;
    gzip: {
      total: number;
      chunks: Record<string, number>;
    };
  };

  runtime: {
    lcp: number;
    fid: number;
    cls: number;
    inp: number;
    tbt: number;

    timeToHydration: number;
    timeToFirstMeaningfulPaint: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
  };

  resources: {
    maxRequests: number;
    maxTotalSize: number;
    maxImageSize: number;
    maxScriptSize: number;
    maxCssSize: number;
    maxFontSize: number;
  };

  memory: {
    maxHeapSize: number;
    maxJsHeapSize: number;
    maxDomNodes: number;
    maxEventListeners: number;
  };

  network: {
    maxLatency: number;
    maxDnsLookup: number;
    maxTtfb: number;
    maxDownloadTime: number;
  };

  animation: {
    minFps: number;
    maxFrameTime: number;
    maxDroppedFrames: number;
  };
}

export const DefaultBudgets: Record<string, PerformanceBudget> = {
  production: {
    bundleSize: {
      total: 250 * 1024,
      chunks: {
        vendor: 100 * 1024,
        main: 50 * 1024,
        common: 30 * 1024,
        styles: 20 * 1024,
      },
      gzip: {
        total: 70 * 1024,
        chunks: {
          vendor: 30 * 1024,
          main: 15 * 1024,
          common: 10 * 1024,
          styles: 8 * 1024,
        },
      },
    },

    runtime: {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      inp: 200,
      tbt: 300,
      timeToHydration: 1500,
      timeToFirstMeaningfulPaint: 2000,
      timeToInteractive: 3800,
      firstContentfulPaint: 1800,
    },

    resources: {
      maxRequests: 50,
      maxTotalSize: 1024 * 1024,
      maxImageSize: 500 * 1024,
      maxScriptSize: 250 * 1024,
      maxCssSize: 100 * 1024,
      maxFontSize: 50 * 1024,
    },

    memory: {
      maxHeapSize: 50,
      maxJsHeapSize: 30,
      maxDomNodes: 1500,
      maxEventListeners: 1000,
    },

    network: {
      maxLatency: 500,
      maxDnsLookup: 100,
      maxTtfb: 600,
      maxDownloadTime: 1000,
    },

    animation: {
      minFps: 60,
      maxFrameTime: 16.67,
      maxDroppedFrames: 2,
    },
  },

  development: {
    bundleSize: {
      total: 500 * 1024,
      chunks: {
        vendor: 200 * 1024,
        main: 100 * 1024,
        common: 50 * 1024,
        styles: 40 * 1024,
      },
      gzip: {
        total: 150 * 1024,
        chunks: {
          vendor: 60 * 1024,
          main: 30 * 1024,
          common: 20 * 1024,
          styles: 15 * 1024,
        },
      },
    },

    runtime: {
      lcp: 4000,
      fid: 200,
      cls: 0.25,
      inp: 400,
      tbt: 600,
      timeToHydration: 3000,
      timeToFirstMeaningfulPaint: 4000,
      timeToInteractive: 7000,
      firstContentfulPaint: 3000,
    },

    resources: {
      maxRequests: 100,
      maxTotalSize: 2 * 1024 * 1024,
      maxImageSize: 1024 * 1024,
      maxScriptSize: 500 * 1024,
      maxCssSize: 200 * 1024,
      maxFontSize: 100 * 1024,
    },

    memory: {
      maxHeapSize: 100,
      maxJsHeapSize: 60,
      maxDomNodes: 3000,
      maxEventListeners: 2000,
    },

    network: {
      maxLatency: 1000,
      maxDnsLookup: 200,
      maxTtfb: 1200,
      maxDownloadTime: 2000,
    },

    animation: {
      minFps: 30,
      maxFrameTime: 33.33,
      maxDroppedFrames: 5,
    },
  },

  testing: {
    bundleSize: {
      total: 1024 * 1024,
      chunks: {
        vendor: 500 * 1024,
        main: 200 * 1024,
        common: 100 * 1024,
        styles: 80 * 1024,
      },
      gzip: {
        total: 300 * 1024,
        chunks: {
          vendor: 150 * 1024,
          main: 60 * 1024,
          common: 40 * 1024,
          styles: 30 * 1024,
        },
      },
    },

    runtime: {
      lcp: 10000,
      fid: 500,
      cls: 0.5,
      inp: 1000,
      tbt: 2000,
      timeToHydration: 10000,
      timeToFirstMeaningfulPaint: 10000,
      timeToInteractive: 15000,
      firstContentfulPaint: 8000,
    },

    resources: {
      maxRequests: 200,
      maxTotalSize: 5 * 1024 * 1024,
      maxImageSize: 2 * 1024 * 1024,
      maxScriptSize: 1024 * 1024,
      maxCssSize: 500 * 1024,
      maxFontSize: 200 * 1024,
    },

    memory: {
      maxHeapSize: 200,
      maxJsHeapSize: 120,
      maxDomNodes: 6000,
      maxEventListeners: 4000,
    },

    network: {
      maxLatency: 2000,
      maxDnsLookup: 500,
      maxTtfb: 2500,
      maxDownloadTime: 5000,
    },

    animation: {
      minFps: 15,
      maxFrameTime: 66.67,
      maxDroppedFrames: 10,
    },
  },
};

export interface BudgetConfig {
  environment: keyof typeof DefaultBudgets;
  customBudget?: Partial<PerformanceBudget>;
  enableWarnings: boolean;
  enableStrictMode: boolean;
  enableReporting: boolean;
  breachThreshold: number;
  samplingRate: number;
}

export const DefaultBudgetConfig: BudgetConfig = {
  environment:
    process.env.NODE_ENV === 'production'
      ? 'production'
      : process.env.NODE_ENV === 'test'
        ? 'testing'
        : 'development',
  enableWarnings: true,
  enableStrictMode: process.env.NODE_ENV === 'production',
  enableReporting: process.env.NODE_ENV === 'production',
  breachThreshold: 3,
  samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
};

export function getEffectiveBudget(config: BudgetConfig): PerformanceBudget {
  const baseBudget: PerformanceBudget =
    DefaultBudgets[config.environment] ?? DefaultBudgets.production!;

  if (config.customBudget) {
    return mergeBudgets(baseBudget, config.customBudget as Partial<PerformanceBudget>);
  }

  return baseBudget;
}

function mergeBudgets(
  base: PerformanceBudget,
  override: Partial<PerformanceBudget>
): PerformanceBudget {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const budgetKey = key as keyof PerformanceBudget;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const baseValue = base[budgetKey];
      if (baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)) {
        merged[budgetKey] = { ...baseValue, ...value } as any;
      } else {
        merged[budgetKey] = value as any;
      }
    } else {
      merged[budgetKey] = value as any;
    }
  }

  return merged;
}

export const BudgetValidationRules = {
  validateBundleSize: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },

  validateRuntimeMetric: (actual: number, budget: number, metric: string): boolean => {
    if (metric === 'cls') {
      return actual <= budget;
    }
    return actual <= budget;
  },

  validateMemoryUsage: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },

  validateNetworkMetric: (actual: number, budget: number): boolean => {
    return actual <= budget;
  },

  validateAnimationPerformance: (actual: number, budget: number, metric: string): boolean => {
    if (metric === 'minFps') {
      return actual >= budget;
    } else {
      return actual <= budget;
    }
  },
};

export enum BudgetBreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export function getBreachSeverity(actual: number, budget: number): BudgetBreachSeverity {
  const ratio = actual / budget;

  if (ratio <= 1) {
    return BudgetBreachSeverity.LOW;
  }
  if (ratio <= 1.25) {
    return BudgetBreachSeverity.MEDIUM;
  }
  if (ratio <= 1.5) {
    return BudgetBreachSeverity.HIGH;
  }
  return BudgetBreachSeverity.CRITICAL;
}

export const BudgetCategories = {
  BUNDLE_SIZE: 'bundleSize',
  RUNTIME_PERFORMANCE: 'runtime',
  RESOURCES: 'resources',
  MEMORY: 'memory',
  NETWORK: 'network',
  ANIMATION: 'animation',
} as const;

export type BudgetCategory = (typeof BudgetCategories)[keyof typeof BudgetCategories];
