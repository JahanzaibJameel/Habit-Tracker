/**
 * React hooks for caching functionality
 * Moved from lib to proper hooks directory
 */

import { useCallback, useEffect, useState } from 'react';

import type { ApiCache } from '@/lib/core/cache';
import { apiCache } from '@/lib/core/cache';

interface UseCacheOptions {
  ttl?: number;
  enabled?: boolean;
  staleTime?: number;
}

interface UseCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
  invalidate: () => void;
  refresh: () => void;
}

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): UseCacheResult<T> {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: any;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    apiCache
      .get(key, fetcher, options.ttl)
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, options.enabled, options.ttl]);

  const invalidate = useCallback(() => {
    apiCache.invalidate(key);
  }, [key]);

  const refresh = useCallback(() => {
    apiCache.invalidate(key);
    // Trigger re-fetch by forcing a state update
    setState((prev) => ({ ...prev, loading: true }));
  }, [key]);

  return {
    ...state,
    invalidate,
    refresh,
  };
}

export function useApiCache(): ApiCache {
  return apiCache;
}
