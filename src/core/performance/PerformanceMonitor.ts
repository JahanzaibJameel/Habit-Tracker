import type { BudgetConfig, PerformanceBudget } from './budget.config';
import {
  BudgetBreachSeverity,
  getEffectiveBudget,
  getBreachSeverity,
  BudgetCategories,
} from './budget.config';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: string;
  budget?: number;
  breached?: boolean;
  severity?: BudgetBreachSeverity;
  metadata?: Record<string, unknown>;
}

export interface PerformanceBreach {
  metric: string;
  category: string;
  actual: number;
  budget: number;
  severity: BudgetBreachSeverity;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMonitorConfig {
  budgetConfig: BudgetConfig;
  enableReporting: boolean;
  reportEndpoint?: string;
  samplingRate: number;
  enableRealTimeMonitoring: boolean;
  enableBundleAnalysis: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  webhookConfig?: WebhookConfig;
}

export interface WebhookConfig {
  url: string;

  secret?: string;

  throttleMs?: number;

  minSeverity?: BudgetBreachSeverity;

  payloadTemplate?: (breach: PerformanceBreach) => Record<string, unknown>;

  headers?: Record<string, string>;

  timeout?: number;

  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private breaches: PerformanceBreach[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private sessionId: string;
  private reportTimer?: NodeJS.Timeout;
  private memoryTimer?: NodeJS.Timeout;
  private networkTimer?: NodeJS.Timeout;
  private webhookLastSent = new Map<string, number>();
  private webhookQueue: PerformanceBreach[] = [];
  private webhookTimer?: NodeJS.Timeout;
  private webhookProcessing = new Set<string>();

  constructor(config: PerformanceMonitorConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();

    this.initializeMetrics();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): void {
    const budget = getEffectiveBudget(this.config.budgetConfig);

    Object.keys(budget.runtime).forEach((metric) => {
      this.metrics.set(metric, []);
    });

    Object.keys(budget.memory).forEach((metric) => {
      this.metrics.set(metric, []);
    });

    Object.keys(budget.network).forEach((metric) => {
      this.metrics.set(metric, []);
    });

    Object.keys(budget.animation).forEach((metric) => {
      this.metrics.set(metric, []);
    });
  }

  start(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already active');
      return;
    }

    if (!this.shouldMonitor()) {
      console.warn('Performance monitoring skipped (sampling rate)');
      return;
    }

    this.isMonitoring = true;
    console.warn('Starting performance monitoring');

    this.setupWebVitalsMonitoring();

    this.setupResourceMonitoring();

    this.setupNavigationTiming();

    if (this.config.enableMemoryMonitoring) {
      this.setupMemoryMonitoring();
    }

    if (this.config.enableNetworkMonitoring) {
      this.setupNetworkMonitoring();
    }

    if (this.config.enableBundleAnalysis) {
      this.setupBundleAnalysis();
    }

    this.startPeriodicReporting();
  }

  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.warn('Stopping performance monitoring');

    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
    }
    if (this.networkTimer) {
      clearInterval(this.networkTimer);
    }
  }

  private shouldMonitor(): boolean {
    return Math.random() <= this.config.samplingRate;
  }

  private setupWebVitalsMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        this.recordMetric('lcp', lastEntry.startTime, BudgetCategories.RUNTIME_PERFORMANCE);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (_error) {
      console.warn('Failed to setup LCP monitoring:', _error);
    }

    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            this.recordMetric(
              'fid',
              ((entry as PerformanceEventTiming & { processingStart?: number }).processingStart ||
                0) - entry.startTime,
              BudgetCategories.RUNTIME_PERFORMANCE
            );
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (_error) {
      console.warn('Failed to setup FID monitoring:', _error);
    }

    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as PerformancePaintTiming & { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as PerformancePaintTiming & { value?: number }).value || 0;
            this.recordMetric('cls', clsValue, BudgetCategories.RUNTIME_PERFORMANCE);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (_error) {
      console.warn('Failed to setup CLS monitoring:', _error);
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('inp', entry.duration, BudgetCategories.RUNTIME_PERFORMANCE);
        });
      });
      inpObserver.observe({ entryTypes: ['event'] });
      this.observers.push(inpObserver);
    } catch (_error) {
      console.warn('Failed to setup INP monitoring:', _error);
    }
  }

  private setupResourceMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const currentCount = this.getMetricValue('resourceCount') || 0;
            this.recordMetric('resourceCount', currentCount + 1, BudgetCategories.RESOURCES);

            const size =
              (entry as PerformanceResourceTiming & { transferSize?: number }).transferSize || 0;
            const currentTotalSize = this.getMetricValue('totalResourceSize') || 0;
            this.recordMetric(
              'totalResourceSize',
              currentTotalSize + size,
              BudgetCategories.RESOURCES
            );
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (_error) {
      console.warn('Failed to setup resource monitoring:', _error);
    }
  }

  private setupNavigationTiming(): void {
    if (!('performance' in window) || !('navigation' in performance)) {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    this.recordMetric(
      'firstContentfulPaint',
      navigation.responseStart - navigation.requestStart,
      BudgetCategories.RUNTIME_PERFORMANCE
    );
    this.recordMetric(
      'timeToInteractive',
      navigation.domInteractive - navigation.requestStart,
      BudgetCategories.RUNTIME_PERFORMANCE
    );
    this.recordMetric(
      'domContentLoaded',
      navigation.domContentLoadedEventEnd - navigation.requestStart,
      BudgetCategories.RUNTIME_PERFORMANCE
    );
    this.recordMetric(
      'loadComplete',
      navigation.loadEventEnd - navigation.requestStart,
      BudgetCategories.RUNTIME_PERFORMANCE
    );
  }

  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) {
      console.warn('Memory API not available');
      return;
    }

    const checkMemory = () => {
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;

      if (!memory) {
        return;
      }

      this.recordMetric(
        'usedHeapSize',
        memory.usedJSHeapSize / 1024 / 1024,
        BudgetCategories.MEMORY
      );
      this.recordMetric(
        'totalHeapSize',
        memory.totalJSHeapSize / 1024 / 1024,
        BudgetCategories.MEMORY
      );
      this.recordMetric(
        'heapSizeLimit',
        memory.jsHeapSizeLimit / 1024 / 1024,
        BudgetCategories.MEMORY
      );
    };

    checkMemory();

    this.memoryTimer = setInterval(checkMemory, 30000);
  }

  private setupNetworkMonitoring(): void {
    if (!('connection' in navigator)) {
      console.warn('Network Information API not available');
      return;
    }

    const checkNetwork = () => {
      const connection = (
        navigator as Navigator & {
          connection?: { effectiveType: string; downlink: number; rtt: number };
        }
      ).connection;

      if (connection) {
        this.recordMetric(
          'effectiveType',
          this.getEffectiveTypeValue(connection.effectiveType),
          BudgetCategories.NETWORK
        );
        this.recordMetric('downlink', connection.downlink, BudgetCategories.NETWORK);
        this.recordMetric('rtt', connection.rtt, BudgetCategories.NETWORK);
      }
    };

    this.networkTimer = setInterval(checkNetwork, 10000);
  }

  private getEffectiveTypeValue(type: string): number {
    const values: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
    };
    return values[type] || 0;
  }

  /**
   * Setup bundle analysis
   */
  private setupBundleAnalysis(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const jsResources = resources.filter((r) => r.name.endsWith('.js'));
      const cssResources = resources.filter((r) => r.name.endsWith('.css'));

      const totalJsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

      this.recordMetric('jsBundleSize', totalJsSize, BudgetCategories.BUNDLE_SIZE);
      this.recordMetric('cssBundleSize', totalCssSize, BudgetCategories.BUNDLE_SIZE);
    }
  }

  recordMetric(
    name: string,
    value: number,
    category: string,
    metadata?: Record<string, unknown>
  ): void {
    const budget = getEffectiveBudget(this.config.budgetConfig);
    const budgetValue = this.getBudgetValue(name, category, budget);

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      budget: budgetValue,
      metadata,
    };

    if (budgetValue !== undefined) {
      const breached = this.checkBudgetBreach(value, budgetValue, name);
      metric.breached = breached;

      if (breached) {
        metric.severity = getBreachSeverity(value, budgetValue);
        this.handleBudgetBreach(metric, budgetValue);
      }
    }

    // Store metric
    const metricList = this.metrics.get(name) || [];
    metricList.push(metric);

    if (metricList.length > 100) {
      metricList.splice(0, metricList.length - 100);
    }

    this.metrics.set(name, metricList);
  }

  private getBudgetValue(
    name: string,
    category: string,
    budget: PerformanceBudget
  ): number | undefined {
    const categoryBudget = budget[category as keyof PerformanceBudget];
    if (!categoryBudget || typeof categoryBudget !== 'object') {
      return undefined;
    }
    return (categoryBudget as Record<string, number>)[name];
  }

  /**
   * Check if a metric value breaches its budget
   */
  private checkBudgetBreach(value: number, budgetValue: number, name: string): boolean {
    // For minFps, lower is worse (breach when value < budget)
    if (name === 'minFps') {
      return value < budgetValue;
    }
    // For all other metrics, higher is worse (breach when value > budget)
    return value > budgetValue;
  }

  /**
   * Handle budget breach
   */
  private handleBudgetBreach(metric: PerformanceMetric, budget: number): void {
    const breach: PerformanceBreach = {
      metric: metric.name,
      category: metric.category,
      actual: metric.value,
      budget,
      severity: metric.severity || BudgetBreachSeverity.MEDIUM,
      timestamp: metric.timestamp,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
    };

    this.breaches.push(breach);

    // Log breach in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Performance budget breach: ${metric.name} (${metric.value}) exceeds budget (${budget})`,
        breach
      );
    }

    // Report breach if enabled
    if (this.config.enableReporting && this.config.reportEndpoint) {
      this.reportBreach(breach);
    }

    if (this.config.budgetConfig.enableWarnings) {
      this.showBreachWarning(breach);
    }

    if (this.config.webhookConfig) {
      this.sendWebhookNotification(breach);
    }
  }

  private async reportBreach(breach: PerformanceBreach): Promise<void> {
    if (!this.config.reportEndpoint) {
      return;
    }

    try {
      await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(breach),
      });
    } catch (_error) {
      console.warn('Failed to report performance breach:', _error);
    }
  }

  private showBreachWarning(breach: PerformanceBreach): void {
    if (typeof console !== 'undefined') {
      console.warn(
        `Performance Warning: ${breach.metric} (${Math.round(breach.actual)}) exceeds budget (${Math.round(breach.budget)})`,
        breach
      );

      if (typeof window !== 'undefined') {
        (window as any).__PERFORMANCE_WARNINGS__ = (window as any).__PERFORMANCE_WARNINGS__ || [];
        (window as any).__PERFORMANCE_WARNINGS__.push({
          id: Date.now(),
          metric: breach.metric,
          actual: breach.actual,
          budget: breach.budget,
          severity: breach.severity,
          timestamp: new Date().toISOString(),
        });

        if ((window as any).__PERFORMANCE_WARNINGS__.length > 10) {
          (window as any).__PERFORMANCE_WARNINGS__.shift();
        }
      }
    }
  }

  private startPeriodicReporting(): void {
    if (!this.config.enableReporting) {
      return;
    }

    this.reportTimer = setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);
  }
  getMetricValue(name: string): number | undefined {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return undefined;
    }

    const latestMetric = metrics[metrics.length - 1];
    return latestMetric?.value;
  }

  getAllMetrics(): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getMetricsByCategory(category: string): PerformanceMetric[] {
    const categoryMetrics: PerformanceMetric[] = [];

    for (const metrics of this.metrics.values()) {
      categoryMetrics.push(...metrics.filter((m) => m.category === category));
    }

    return categoryMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getBreaches(): PerformanceBreach[] {
    return [...this.breaches].sort((a, b) => b.timestamp - a.timestamp);
  }

  getBreachStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<BudgetBreachSeverity, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const recentBreaches = this.breaches.filter((b) => b.timestamp > oneHourAgo);

    const byCategory = this.breaches.reduce(
      (acc, breach) => {
        acc[breach.category] = (acc[breach.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const bySeverity = this.breaches.reduce(
      (acc, breach) => {
        acc[breach.severity] = (acc[breach.severity] || 0) + 1;
        return acc;
      },
      {} as Record<BudgetBreachSeverity, number>
    );

    return {
      total: this.breaches.length,
      byCategory,
      bySeverity,
      recent: recentBreaches.length,
    };
  }

  generatePerformanceReport(): void {
    const report = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      breaches: this.getBreaches(),
      stats: this.getBreachStats(),
    };

    console.warn('Performance Report:', report);
  }

  exportData(): string {
    const data = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      breaches: this.getBreaches(),
      stats: this.getBreachStats(),
    };

    return JSON.stringify(data, null, 2);
  }

  clearData(): void {
    this.metrics.clear();
    this.breaches = [];
    this.webhookQueue = [];
    this.webhookLastSent.clear();
    this.initializeMetrics();
  }

  private async sendWebhookNotification(breach: PerformanceBreach): Promise<void> {
    const webhookConfig = this.config.webhookConfig;
    if (!webhookConfig) {
      return;
    }

    if (webhookConfig.minSeverity && breach.severity < webhookConfig.minSeverity) {
      return;
    }

    const processingKey = `${breach.metric}_${breach.category}`;
    if (this.webhookProcessing.has(processingKey)) {
      return;
    }

    this.webhookProcessing.add(processingKey);

    const throttleKey = `${breach.metric}_${breach.category}`;
    const now = Date.now();
    const lastSent = this.webhookLastSent.get(throttleKey) || 0;
    const throttleMs = webhookConfig.throttleMs || 60000;

    if (now - lastSent < throttleMs) {
      this.webhookQueue.push(breach);
      this.scheduleWebhookProcessing();
      return;
    }

    this.webhookLastSent.set(throttleKey, now);

    try {
      await this.executeWebhook(breach, webhookConfig);
    } catch (_error) {
      console.error('Webhook notification failed:', _error);

      this.webhookQueue.push(breach);
      this.scheduleWebhookProcessing();
    }
  }

  private async executeWebhook(breach: PerformanceBreach, config: WebhookConfig): Promise<void> {
    const maxAttempts = config.retry?.maxAttempts || 3;
    const backoffMs = config.retry?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = config.payloadTemplate
          ? config.payloadTemplate(breach)
          : this.createDefaultWebhookPayload(breach);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'PerformanceMonitor/1.0',
          ...config.headers,
        };

        // Add signature if secret is provided
        if (config.secret) {
          const signature = await this.generateWebhookSignature(payload, config.secret);
          headers['X-Webhook-Signature'] = signature;
        }

        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(config.timeout || 10000),
        });

        if (!response.ok) {
          throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
        }

        // Success - clear any queued notifications for this metric
        this.webhookQueue = this.webhookQueue.filter(
          (q) => !(q.metric === breach.metric && q.category === breach.category)
        );

        return;
      } catch (_error) {
        if (attempt === maxAttempts) {
          throw _error;
        }

        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  private createDefaultWebhookPayload(breach: PerformanceBreach): Record<string, unknown> {
    return {
      timestamp: new Date(breach.timestamp).toISOString(),
      severity: breach.severity,
      metric: breach.metric,
      category: breach.category,
      actual: breach.actual,
      budget: breach.budget,
      percentageOverBudget: (((breach.actual - breach.budget) / breach.budget) * 100).toFixed(2),
      url: breach.url || '',
      userAgent: breach.userAgent || '',
      sessionId: breach.sessionId || '',
      environment: process.env.NODE_ENV || 'unknown',
      alert: {
        title: `Performance Budget Breach: ${breach.metric}`,
        text: `${breach.metric} (${breach.actual}) exceeds budget (${breach.budget}) by ${(((breach.actual - breach.budget) / breach.budget) * 100).toFixed(2)}%`,
        severity: breach.severity,
        category: breach.category,
      },
    };
  }

  private async generateWebhookSignature(
    payload: Record<string, unknown>,
    secret: string
  ): Promise<string> {
    const crypto =
      typeof window !== 'undefined' && window.crypto
        ? window.crypto
        : (globalThis as { crypto?: Crypto }).crypto;

    if (!crypto) {
      console.warn('Crypto API not available, webhook signature omitted');
      return '';
    }

    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString + secret);

    const buffer: ArrayBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(buffer))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256=${hashArray}`;
  }

  private scheduleWebhookProcessing(): void {
    if (this.webhookTimer) {
      return;
    }

    this.webhookTimer = setTimeout(() => {
      this.processWebhookQueue();
      this.webhookTimer = undefined;
    }, 30000);
  }

  private async processWebhookQueue(): Promise<void> {
    if (this.webhookQueue.length === 0 || !this.config.webhookConfig) {
      return;
    }

    const queue = [...this.webhookQueue];
    this.webhookQueue = [];

    for (const breach of queue) {
      try {
        await this.sendWebhookNotification(breach);
      } catch (_error) {
        console.error('Failed to process queued webhook notification:', _error);
        this.webhookQueue.push(breach);
      }
    }
  }

  getWebhookStats(): {
    queueSize: number;
    lastSent: Record<string, number>;
    config: WebhookConfig | undefined;
  } {
    return {
      queueSize: this.webhookQueue.length,
      lastSent: Object.fromEntries(this.webhookLastSent),
      config: this.config.webhookConfig,
    };
  }

  async forceProcessWebhookQueue(): Promise<void> {
    await this.processWebhookQueue();
  }
}
