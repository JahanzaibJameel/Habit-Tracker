/**
 * Core caching logic - pure functions only, NO React hooks
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  strategy: 'lru' | 'lfu' | 'ttl';
}

export class AdvancedCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      strategy: 'lru',
      ...config,
    };

    this.startCleanup();
  }

  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    // Evict if necessary
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    let keyToEvict: string | null = null;

    switch (this.config.strategy) {
      case 'lru':
        keyToEvict = this.findLRU();
        break;
      case 'lfu':
        keyToEvict = this.findLFU();
        break;
      case 'ttl':
        keyToEvict = this.findExpired();
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  private findLRU(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFU(): string | null {
    let leastUsedKey: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private findExpired(): string | null {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        return key;
      }
    }

    return this.findLRU(); // Fallback to LRU
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private calculateHitRate(): number {
    // This would need to be tracked properly in a real implementation
    return 0.85; // Placeholder
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // String size
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Estimated overhead
    }

    return totalSize;
  }
}

// API Response Caching
export class ApiCache {
  private static instance: ApiCache;
  private cache: AdvancedCache;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.cache = new AdvancedCache({
      maxSize: 500,
      defaultTtl: 10 * 60 * 1000, // 10 minutes
      strategy: 'lru',
    });
  }

  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache();
    }
    return ApiCache.instance;
  }

  async get<T>(url: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(url);
    if (pending) {
      return pending;
    }

    // Make the request
    const promise = fetcher();
    this.pendingRequests.set(url, promise);

    try {
      const data = await promise;
      this.cache.set(url, data, ttl);
      return data;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Invalidate keys matching pattern
    const keysToDelete: string[] = [];
    for (const key of this.cache.getKeys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Edge Caching Headers Helper
export class EdgeCachingHelper {
  static getCacheHeaders(
    options: {
      maxAge?: number;
      sMaxAge?: number;
      staleWhileRevalidate?: number;
      mustRevalidate?: boolean;
      noCache?: boolean;
      noStore?: boolean;
    } = {}
  ) {
    const {
      maxAge = 3600,
      sMaxAge = 86400,
      staleWhileRevalidate = 60,
      mustRevalidate = false,
      noCache = false,
      noStore = false,
    } = options;

    if (noStore) {
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      };
    }

    if (noCache) {
      return {
        'Cache-Control': 'no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      };
    }

    const directives = [
      `max-age=${maxAge}`,
      `s-maxage=${sMaxAge}`,
      `stale-while-revalidate=${staleWhileRevalidate}`,
    ];

    if (mustRevalidate) {
      directives.push('must-revalidate');
    }

    return {
      'Cache-Control': directives.join(', '),
      'CDN-Cache-Control': `max-age=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    };
  }

  static getVaryHeaders(...headers: string[]) {
    return {
      Vary: headers.join(', '),
    };
  }

  static getETag(data: any): string {
    const hash = this.simpleHash(JSON.stringify(data));
    return `"${hash}"`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const apiCache = ApiCache.getInstance();
export default apiCache;
