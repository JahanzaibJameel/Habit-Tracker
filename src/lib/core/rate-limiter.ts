/**
 * Core rate limiting logic - pure functions only, NO React hooks
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private store: Map<string, { count: number; resetTime: Date }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  isAllowed(config: RateLimitConfig, request: any): RateLimitResult {
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : this.defaultKeyGenerator(request);
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Get existing record or create new one
    let record = this.store.get(key);
    if (!record || record.resetTime < windowStart) {
      record = { count: 0, resetTime: new Date(now.getTime() + config.windowMs) };
      this.store.set(key, record);
    }

    // Increment counter
    record.count++;
    const remaining = Math.max(0, config.maxRequests - record.count);
    const allowed = record.count <= config.maxRequests;

    // Calculate retry after if not allowed
    const retryAfter = allowed ? 0 : Math.ceil((record.resetTime.getTime() - now.getTime()) / 1000);

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
      retryAfter,
    };
  }

  private defaultKeyGenerator(request: any): string {
    // For API requests, use IP + User-Agent
    if (request.ip && request.headers) {
      const ip = request.ip;
      const userAgent = request.headers.get('user-agent') || '';
      return `${ip}:${this.hashString(userAgent)}`;
    }

    // For client-side requests, use a session ID
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('rate-limit-session');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('rate-limit-session', sessionId);
      }
      return sessionId;
    }

    // Fallback to random key
    return Math.random().toString(36).substring(2);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private cleanup() {
    const now = new Date();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  // Admin methods
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = new Date();
    let activeKeys = 0;

    for (const record of this.store.values()) {
      if (record.resetTime > now) {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.store.size,
      activeKeys,
    };
  }

  resetKey(key: string): void {
    this.store.delete(key);
  }

  reset(config: RateLimitConfig, request?: any): void {
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : this.defaultKeyGenerator(request);

    this.resetKey(key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Specific rate limiters for different use cases
export const rateLimiters = {
  // API endpoints: 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyGenerator: (request: any) => {
      const ip = request.ip || request.headers?.get('x-forwarded-for') || 'unknown';
      const endpoint = request.url || request.pathname || 'unknown';
      return `api:${ip}:${endpoint}`;
    },
  },

  // Authentication: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (request: any) => {
      const ip = request.ip || request.headers?.get('x-forwarded-for') || 'unknown';
      return `auth:${ip}`;
    },
  },

  // Data export: 1 request per hour
  export: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1,
    keyGenerator: (request: any) => {
      const ip = request.ip || request.headers?.get('x-forwarded-for') || 'unknown';
      return `export:${ip}`;
    },
  },

  // Real-time features: 60 requests per minute
  realtime: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyGenerator: (request: any) => {
      const ip = request.ip || request.headers?.get('x-forwarded-for') || 'unknown';
      return `realtime:${ip}`;
    },
  },
};

// Express/Next.js middleware
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = RateLimiter.getInstance();

  return function middleware(request: any, response: any, next: any) {
    const result = limiter.isAllowed(config, request);

    // Set rate limit headers
    response.set({
      'X-RateLimit-Limit': config.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000),
    });

    if (!result.allowed) {
      response.set('Retry-After', result.retryAfter);
      return response.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

// Client-side rate limiting for API calls
export class ApiRateLimiter {
  private limiter: RateLimiter;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.limiter = RateLimiter.getInstance();
    this.config = config;
  }

  async execute<T>(apiCall: () => Promise<T>, request?: any): Promise<T> {
    const result = this.limiter.isAllowed(this.config, request);

    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
    }

    return apiCall();
  }
}

export const rateLimiter = RateLimiter.getInstance();
export default rateLimiter;
