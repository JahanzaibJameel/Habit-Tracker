/**
 * Core feature flag logic - pure functions only, NO React hooks
 */

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  description: string;
  conditions?: FeatureFlagCondition[];
}

interface FeatureFlagCondition {
  type: 'user_id' | 'user_property' | 'environment' | 'date_range';
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'between';
  value: any;
}

interface UserContext {
  userId: string;
  properties: Record<string, string>;
  environment: 'development' | 'staging' | 'production';
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();
  private userContext: UserContext | null = null;

  private constructor() {
    this.loadFlags();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  private loadFlags() {
    // Default feature flags - in production, these would come from a remote service
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'advanced-analytics',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable advanced analytics dashboard',
      },
      {
        key: 'social-sharing',
        enabled: false,
        rolloutPercentage: 10,
        description: 'Enable social sharing features',
      },
      {
        key: 'ai-suggestions',
        enabled: false,
        rolloutPercentage: 5,
        description: 'Enable AI-powered habit suggestions',
      },
      {
        key: 'dark-mode-optimizations',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable dark mode optimizations',
      },
      {
        key: 'beta-features',
        enabled: false,
        rolloutPercentage: 1,
        description: 'Enable beta features for early adopters',
      },
      {
        key: 'performance-monitoring',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable performance monitoring',
      },
      {
        key: 'offline-mode',
        enabled: true,
        rolloutPercentage: 50,
        description: 'Enable offline mode',
      },
      {
        key: 'real-time-sync',
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enable real-time synchronization',
      },
    ];

    defaultFlags.forEach((flag) => {
      this.flags.set(flag.key, flag);
    });

    // Load overrides from localStorage or environment
    this.loadLocalOverrides();
  }

  private loadLocalOverrides() {
    if (typeof window === 'undefined') return;

    try {
      const overrides = localStorage.getItem('feature-flags');
      if (overrides) {
        const parsedOverrides = JSON.parse(overrides);
        Object.entries(parsedOverrides).forEach(([key, enabled]) => {
          const flag = this.flags.get(key);
          if (flag) {
            flag.enabled = Boolean(enabled);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load feature flag overrides:', error);
    }
  }

  setUserContext(context: UserContext) {
    this.userContext = context;
  }

  isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`Feature flag "${flagKey}" not found`);
      return false;
    }

    // Check if flag is explicitly enabled/disabled
    if (flag.enabled && flag.rolloutPercentage === 100) {
      return true;
    }

    if (!flag.enabled && flag.rolloutPercentage === 0) {
      return false;
    }

    // Check conditions
    if (flag.conditions && this.userContext) {
      const meetsConditions = flag.conditions.every((condition) =>
        this.evaluateCondition(condition)
      );
      if (meetsConditions) {
        return true;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage > 0) {
      return this.isInRollout(flag.rolloutPercentage);
    }

    return flag.enabled;
  }

  private evaluateCondition(condition: FeatureFlagCondition): boolean {
    if (!this.userContext) return false;

    switch (condition.type) {
      case 'user_id':
        return this.evaluateStringCondition(
          this.userContext.userId,
          condition.operator,
          condition.value
        );

      case 'user_property':
        const propertyValue = this.userContext.properties[condition.value.property];
        return this.evaluateStringCondition(
          propertyValue,
          condition.operator,
          condition.value.expectedValue
        );

      case 'environment':
        return this.evaluateStringCondition(
          this.userContext.environment,
          condition.operator,
          condition.value
        );

      case 'date_range':
        const now = new Date();
        const startDate = new Date(condition.value.start);
        const endDate = new Date(condition.value.end);
        return now >= startDate && now <= endDate;

      default:
        return false;
    }
  }

  private evaluateStringCondition(
    actual: string | undefined,
    operator: string,
    expected: string
  ): boolean {
    if (actual === undefined) return false;

    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return actual.includes(expected);
      case 'starts_with':
        return actual.startsWith(expected);
      case 'ends_with':
        return actual.endsWith(expected);
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'between':
        const [min, max] = expected.split(',').map((s) => s.trim());
        return Boolean(min && max && actual >= min && actual <= max);
      default:
        return false;
    }
  }

  private isInRollout(percentage: number): boolean {
    if (!this.userContext) return false;

    // Use user ID for consistent rollout
    const hash = this.hashString(this.userContext.userId);
    const rolloutValue = hash % 100;
    return rolloutValue < percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Admin methods for managing flags
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(key);
    if (flag) {
      Object.assign(flag, updates);
      this.saveLocalOverrides();
    }
  }

  private saveLocalOverrides() {
    if (typeof window === 'undefined') return;

    try {
      const overrides: Record<string, boolean> = {};
      this.flags.forEach((flag, key) => {
        overrides[key] = Boolean(flag.enabled);
      });
      localStorage.setItem('feature-flags', JSON.stringify(overrides));
    } catch (error) {
      console.error('Failed to save feature flag overrides:', error);
    }
  }

  // Analytics integration
  trackFlagUsage(flagKey: string, enabled: boolean) {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('feature_flag_evaluated', {
        flag_key: flagKey,
        enabled,
        user_id: this.userContext?.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const featureFlagService = FeatureFlagService.getInstance();
export default featureFlagService;
