/**
 * Real-time performance monitoring with budget enforcement
 * Tracks Core Web Vitals and custom metrics with automatic breach detection
 * 
 * @fileoverview Performance monitoring implementation
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { getEffectiveBudget, BudgetConfig, BudgetBreachSeverity, getBreachSeverity, BudgetCategories, PerformanceBudget } from './budget.config';

/**
 * Performance metric entry
 */
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

/**
 * Performance breach report
 */
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

/**
 * Performance monitor configuration
 */
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

/**
 * Webhook configuration for performance alerts
 */
export interface WebhookConfig {
  /**
   * Webhook URL for notifications
   */
  url: string;
  
  /**
   * Webhook secret for authentication
   */
  secret?: string;
  
  /**
   * Throttle webhook notifications (in milliseconds)
   */
  throttleMs?: number;
  
  /**
   * Minimum severity level to trigger webhook
   */
  minSeverity?: BudgetBreachSeverity;
  
  /**
   * Custom webhook payload template
   */
  payloadTemplate?: (breach: PerformanceBreach) => any;
  
  /**
   * Custom headers for webhook requests
   */
  headers?: Record<string, string>;
  
  /**
   * Timeout for webhook requests (in milliseconds)
   */
  timeout?: number;
  
  /**
   * Retry configuration for failed webhooks
   */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Performance monitor class
 */
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

  constructor(config: PerformanceMonitorConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    
    // Initialize metrics storage
    this.initializeMetrics();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize metrics storage
   */
  private initializeMetrics(): void {
    const budget = getEffectiveBudget(this.config.budgetConfig);
    
    // Initialize runtime metrics
    Object.keys(budget.runtime).forEach(metric => {
      this.metrics.set(metric, []);
    });
    
    // Initialize memory metrics
    Object.keys(budget.memory).forEach(metric => {
      this.metrics.set(metric, []);
    });
    
    // Initialize network metrics
    Object.keys(budget.network).forEach(metric => {
      this.metrics.set(metric, []);
    });
    
    // Initialize animation metrics
    Object.keys(budget.animation).forEach(metric => {
      this.metrics.set(metric, []);
    });
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already active');
      return;
    }

    if (!this.shouldMonitor()) {
      console.log('Performance monitoring skipped (sampling rate)');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting performance monitoring');

    // Setup Core Web Vitals monitoring
    this.setupWebVitalsMonitoring();
    
    // Setup resource monitoring
    this.setupResourceMonitoring();
    
    // Setup navigation timing
    this.setupNavigationTiming();
    
    // Setup memory monitoring if enabled
    if (this.config.enableMemoryMonitoring) {
      this.setupMemoryMonitoring();
    }
    
    // Setup network monitoring if enabled
    if (this.config.enableNetworkMonitoring) {
      this.setupNetworkMonitoring();
    }
    
    // Setup bundle analysis if enabled
    if (this.config.enableBundleAnalysis) {
      this.setupBundleAnalysis();
    }

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log('Stopping performance monitoring');

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear timers
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

  /**
   * Check if monitoring should run based on sampling rate
   */
  private shouldMonitor(): boolean {
    return Math.random() <= this.config.samplingRate;
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupWebVitalsMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Monitor Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        this.recordMetric('lcp', lastEntry.startTime, BudgetCategories.RUNTIME_PERFORMANCE);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('Failed to setup LCP monitoring:', error);
    }

    // Monitor First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            this.recordMetric('fid', (entry as any).processingStart - entry.startTime, BudgetCategories.RUNTIME_PERFORMANCE);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('Failed to setup FID monitoring:', error);
    }

    // Monitor Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.recordMetric('cls', clsValue, BudgetCategories.RUNTIME_PERFORMANCE);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Failed to setup CLS monitoring:', error);
    }

    // Monitor Interaction to Next Paint
    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('inp', entry.duration, BudgetCategories.RUNTIME_PERFORMANCE);
        });
      });
      inpObserver.observe({ entryTypes: ['event'] });
      this.observers.push(inpObserver);
    } catch (error) {
      console.warn('Failed to setup INP monitoring:', error);
    }
  }

  /**
   * Setup resource monitoring
   */
  private setupResourceMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            // Track resource count and sizes
            const currentCount = this.getMetricValue('resourceCount') || 0;
            this.recordMetric('resourceCount', currentCount + 1, BudgetCategories.RESOURCES);

            // Track resource sizes
            const size = (entry as any).transferSize || 0;
            const currentTotalSize = this.getMetricValue('totalResourceSize') || 0;
            this.recordMetric('totalResourceSize', currentTotalSize + size, BudgetCategories.RESOURCES);
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Failed to setup resource monitoring:', error);
    }
  }

  /**
   * Setup navigation timing
   */
  private setupNavigationTiming(): void {
    if (!('performance' in window) || !('navigation' in performance)) {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Record key navigation metrics
    this.recordMetric('firstContentfulPaint', navigation.responseStart - navigation.requestStart, BudgetCategories.RUNTIME_PERFORMANCE);
    this.recordMetric('timeToInteractive', navigation.domInteractive - navigation.requestStart, BudgetCategories.RUNTIME_PERFORMANCE);
    this.recordMetric('domContentLoaded', navigation.domContentLoadedEventEnd - navigation.requestStart, BudgetCategories.RUNTIME_PERFORMANCE);
    this.recordMetric('loadComplete', navigation.loadEventEnd - navigation.requestStart, BudgetCategories.RUNTIME_PERFORMANCE);
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) {
      console.warn('Memory API not available');
      return;
    }

    const checkMemory = () => {
      const memory = (performance as any).memory;
      
      this.recordMetric('usedHeapSize', memory.usedJSHeapSize / 1024 / 1024, BudgetCategories.MEMORY);
      this.recordMetric('totalHeapSize', memory.totalJSHeapSize / 1024 / 1024, BudgetCategories.MEMORY);
      this.recordMetric('heapSizeLimit', memory.jsHeapSizeLimit / 1024 / 1024, BudgetCategories.MEMORY);
    };

    // Check memory immediately
    checkMemory();

    // Check memory every 30 seconds
    this.memoryTimer = setInterval(checkMemory, 30000);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (!('connection' in navigator)) {
      console.warn('Network Information API not available');
      return;
    }

    const checkNetwork = () => {
      const connection = (navigator as any).connection;
      
      if (connection) {
        this.recordMetric('effectiveType', this.getEffectiveTypeValue(connection.effectiveType), BudgetCategories.NETWORK);
        this.recordMetric('downlink', connection.downlink, BudgetCategories.NETWORK);
        this.recordMetric('rtt', connection.rtt, BudgetCategories.NETWORK);
      }
    };

    // Check network immediately
    checkNetwork();

    // Check network every 10 seconds
    this.networkTimer = setInterval(checkNetwork, 10000);
  }

  /**
   * Convert effective type to numeric value for comparison
   */
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
    // This would typically integrate with webpack-bundle-analyzer or similar
    // For now, we'll track basic bundle metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const cssResources = resources.filter(r => r.name.endsWith('.css'));
      
      const totalJsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      
      this.recordMetric('jsBundleSize', totalJsSize, BudgetCategories.BUNDLE_SIZE);
      this.recordMetric('cssBundleSize', totalCssSize, BudgetCategories.BUNDLE_SIZE);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, category: string, metadata?: Record<string, unknown>): void {
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

    // Check for budget breach
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
    
    // Keep only last 100 metrics per type
    if (metricList.length > 100) {
      metricList.splice(0, metricList.length - 100);
    }
    
    this.metrics.set(name, metricList);
  }

  /**
   * Get budget value for a metric by name and category
   */
  private getBudgetValue(name: string, category: string, budget: PerformanceBudget): number | undefined {
    const categoryBudget = budget[category as keyof PerformanceBudget];
    if (!categoryBudget || typeof categoryBudget !== 'object') return undefined;
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
      severity: metric.severity!,
      timestamp: metric.timestamp,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
    };

    this.breaches.push(breach);

    // Log breach in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Performance budget breach: ${metric.name} (${metric.value}) exceeds budget (${budget})`, breach);
    }

    // Report breach if enabled
    if (this.config.enableReporting && this.config.reportEndpoint) {
      this.reportBreach(breach);
    }

    // Show warning in UI if enabled
    if (this.config.budgetConfig.enableWarnings) {
      this.showBreachWarning(breach);
    }

    // Send webhook notification if configured
    if (this.config.webhookConfig) {
      this.sendWebhookNotification(breach);
    }
  }

  /**
   * Report breach to monitoring service
   */
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
    } catch (error) {
      console.warn('Failed to report performance breach:', error);
    }
  }

  /**
   * Show breach warning in UI
   */
  private showBreachWarning(breach: PerformanceBreach): void {
    // Create a non-intrusive warning banner
    if (typeof document !== 'undefined') {
      const existingWarning = document.getElementById('performance-warning');
      if (existingWarning) {
        existingWarning.remove();
      }

      const warning = document.createElement('div');
      warning.id = 'performance-warning';
      warning.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff6b6b;
        color: white;
        padding: 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        max-width: 300px;
      `;
      warning.innerHTML = `
        <strong>Performance Warning</strong><br>
        ${breach.metric}: ${Math.round(breach.actual)} exceeds budget of ${Math.round(breach.budget)}
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; border: none; background: white; color: #ff6b6b; padding: 2px 6px; border-radius: 2px; cursor: pointer;">×</button>
      `;
      
      document.body.appendChild(warning);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (warning.parentElement) {
          warning.remove();
        }
      }, 10000);
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    if (!this.config.enableReporting) {
      return;
    }

    // Report every 5 minutes
    this.reportTimer = setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);
  }
  /**
   * Get metric value
   */
  getMetricValue(name: string): number | undefined {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return undefined;
    }
    
    // Return the latest value
    return metrics[metrics.length - 1]!.value;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: string): PerformanceMetric[] {
    const categoryMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      categoryMetrics.push(...metrics.filter(m => m.category === category));
    }
    
    return categoryMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all breaches
   */
  getBreaches(): PerformanceBreach[] {
    return [...this.breaches].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get breach statistics
   */
  getBreachStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<BudgetBreachSeverity, number>;
    recent: number; // Last hour
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentBreaches = this.breaches.filter(b => b.timestamp > oneHourAgo);
    
    const byCategory = this.breaches.reduce((acc, breach) => {
      acc[breach.category] = (acc[breach.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = this.breaches.reduce((acc, breach) => {
      acc[breach.severity] = (acc[breach.severity] || 0) + 1;
      return acc;
    }, {} as Record<BudgetBreachSeverity, number>);
    
    return {
      total: this.breaches.length,
      byCategory,
      bySeverity,
      recent: recentBreaches.length,
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): void {
    const report = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      breaches: this.getBreaches(),
      stats: this.getBreachStats(),
    };
    
    console.log('Performance Report:', report);
  }

  /**
   * Export performance data
   */
  exportData(): string {
    const data = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      breaches: this.getBreaches(),
      stats: this.getBreachStats(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.metrics.clear();
    this.breaches = [];
    this.webhookQueue = [];
    this.webhookLastSent.clear();
    this.initializeMetrics();
  }

  /**
   * Send webhook notification for performance breach
   */
  private async sendWebhookNotification(breach: PerformanceBreach): Promise<void> {
    const webhookConfig = this.config.webhookConfig!;
    
    // Check minimum severity requirement
    if (webhookConfig.minSeverity && breach.severity < webhookConfig.minSeverity) {
      return;
    }

    // Check throttling
    const throttleKey = `${breach.metric}_${breach.category}`;
    const now = Date.now();
    const lastSent = this.webhookLastSent.get(throttleKey) || 0;
    const throttleMs = webhookConfig.throttleMs || 60000; // 1 minute default
    
    if (now - lastSent < throttleMs) {
      // Add to queue for later processing
      this.webhookQueue.push(breach);
      this.scheduleWebhookProcessing();
      return;
    }

    // Update last sent timestamp
    this.webhookLastSent.set(throttleKey, now);

    try {
      await this.executeWebhook(breach, webhookConfig);
    } catch (error) {
      console.error('Webhook notification failed:', error);
      
      // Add to queue for retry
      this.webhookQueue.push(breach);
      this.scheduleWebhookProcessing();
    }
  }

  /**
   * Execute webhook request with retry logic
   */
  private async executeWebhook(breach: PerformanceBreach, config: WebhookConfig): Promise<void> {
    const maxAttempts = config.retry?.maxAttempts || 3;
    const backoffMs = config.retry?.backoffMs || 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = config.payloadTemplate ? config.payloadTemplate(breach) : this.createDefaultWebhookPayload(breach);
        
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
        this.webhookQueue = this.webhookQueue.filter(q => 
          !(q.metric === breach.metric && q.category === breach.category)
        );
        
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  /**
   * Create default webhook payload
   */
  private createDefaultWebhookPayload(breach: PerformanceBreach): any {
    return {
      timestamp: new Date(breach.timestamp).toISOString(),
      severity: breach.severity,
      metric: breach.metric,
      category: breach.category,
      actual: breach.actual,
      budget: breach.budget,
      percentageOverBudget: ((breach.actual - breach.budget) / breach.budget * 100).toFixed(2),
      url: breach.url || '',
      userAgent: breach.userAgent || '',
      sessionId: breach.sessionId || '',
      environment: process.env.NODE_ENV || 'unknown',
      alert: {
        title: `Performance Budget Breach: ${breach.metric}`,
        text: `${breach.metric} (${breach.actual}) exceeds budget (${breach.budget}) by ${((breach.actual - breach.budget) / breach.budget * 100).toFixed(2)}%`,
        severity: breach.severity,
        category: breach.category,
      },
    };
  }

  /**
   * Generate webhook signature for authentication
   */
  private async generateWebhookSignature(payload: any, secret: string): Promise<string> {
    const crypto = typeof window !== 'undefined' && window.crypto 
      ? window.crypto 
      : (globalThis as any).crypto;
    
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

  /**
   * Schedule processing of queued webhook notifications
   */
  private scheduleWebhookProcessing(): void {
    if (this.webhookTimer) {
      return;
    }

    this.webhookTimer = setTimeout(() => {
      this.processWebhookQueue();
      this.webhookTimer = undefined;
    }, 30000); // Process queue after 30 seconds
  }

  /**
   * Process queued webhook notifications
   */
  private async processWebhookQueue(): Promise<void> {
    if (this.webhookQueue.length === 0 || !this.config.webhookConfig) {
      return;
    }

    const queue = [...this.webhookQueue];
    this.webhookQueue = [];

    for (const breach of queue) {
      try {
        await this.sendWebhookNotification(breach);
      } catch (error) {
        console.error('Failed to process queued webhook notification:', error);
        // Re-add to queue for next attempt
        this.webhookQueue.push(breach);
      }
    }
  }

  /**
   * Get webhook statistics
   */
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

  /**
   * Force process webhook queue (useful for testing)
   */
  async forceProcessWebhookQueue(): Promise<void> {
    await this.processWebhookQueue();
  }
}
