/**
 * React hooks for rate limiting functionality
 * Moved from lib to proper hooks directory
 */

import { useCallback, useState } from 'react';

import type { RateLimiter } from '@/lib/core/rate-limiter';
import { rateLimiter } from '@/lib/core/rate-limiter';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

interface UseRateLimiterResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date | null;
  retryAfter: number | null;
  checkLimit: (request?: any) => {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  };
  reset: () => void;
}

export function useRateLimiter(config: RateLimitConfig): UseRateLimiterResult {
  const limiter = rateLimiter;
  const [state, setState] = useState<{
    allowed: boolean;
    remaining: number;
    resetTime: Date | null;
    retryAfter: number | null;
  }>({
    allowed: true,
    remaining: config.maxRequests,
    resetTime: null,
    retryAfter: null,
  });

  const checkLimit = useCallback(
    (request?: any) => {
      const result = limiter.isAllowed(config, request);
      setState({
        allowed: result.allowed,
        remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter || null,
      });
      return result;
    },
    [config]
  );

  const reset = useCallback(() => {
    limiter.reset(config);
    setState({
      allowed: true,
      remaining: config.maxRequests,
      resetTime: null,
      retryAfter: null,
    });
  }, [config]);

  return {
    ...state,
    checkLimit,
    reset,
  };
}

export function useRateLimiterService(): RateLimiter {
  return rateLimiter;
}
