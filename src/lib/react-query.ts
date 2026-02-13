import { QueryClient, QueryFunctionContext } from '@tanstack/react-query';
import { PersistQueryClientProvider, PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Custom IDB persister for IndexedDB
export const createIDBPersister = (idbValidKey: IDBValidKey = 'reactQuery'): Persister => ({
  persistClient: async (client: PersistedClient) => {
    await set(idbValidKey, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(idbValidKey);
  },
  removeClient: async () => {
    await del(idbValidKey);
  },
});

// Create a custom fetch function with offline support
export const customFetch = async <T>({ queryKey, signal }: QueryFunctionContext): Promise<T> => {
  const [key, params] = queryKey;
  
  // For now, we're using IndexedDB as the source
  // In a real app, this would fetch from your API
  if (typeof key === 'string') {
    // Handle different query types
    switch (key) {
      case 'habits':
        // Return from Dexie
        const { db } = await import('@/db');
        return db.habits.toArray() as unknown as T;
      case 'completions':
        const date = params as string;
        const { db: db2 } = await import('@/db');
        if (date) {
          return db2.completions.where('date').equals(date).toArray() as unknown as T;
        }
        return db2.completions.toArray() as unknown as T;
      case 'analytics':
        // Calculate analytics from stored data
        const { calculateAnalytics } = await import('@/lib/analytics');
        return calculateAnalytics() as unknown as T;
      default:
        throw new Error(`Unknown query key: ${key}`);
    }
  }
  
  throw new Error('Invalid query key');
};

// Error handling wrapper
export const queryFnWrapper = async <T>(context: QueryFunctionContext): Promise<T> => {
  try {
    return await customFetch<T>(context);
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Default query options
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: true,
};

// Create query client with offline support
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: queryFnWrapper,
      ...defaultQueryOptions,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
});

// Create IDB persister
export const persister = createIDBPersister();

// Initialize with default data
export const initializeQueryClient = async () => {
  // Prefetch some data
  await queryClient.prefetchQuery({
    queryKey: ['habits'],
    queryFn: () => customFetch({ queryKey: ['habits'] } as QueryFunctionContext),
  });
  
  await queryClient.prefetchQuery({
    queryKey: ['completions', new Date().toISOString().split('T')[0]],
    queryFn: () => customFetch({ 
      queryKey: ['completions', new Date().toISOString().split('T')[0]] 
    } as QueryFunctionContext),
  });
  
  return queryClient;
};

// Hooks for common queries
export const queryKeys = {
  habits: ['habits'] as const,
  habit: (id: string) => ['habit', id] as const,
  completions: (date?: string) => ['completions', date || new Date().toISOString().split('T')[0]] as const,
  analytics: ['analytics'] as const,
  streaks: ['streaks'] as const,
  weeklyProgress: (weekStart: string) => ['weeklyProgress', weekStart] as const,
  monthlyOverview: (month: string) => ['monthlyOverview', month] as const,
};

// Utility to check if we're online
export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// Utility for optimistic updates
export const optimisticUpdate = <T>({
  queryKey,
  updateFn,
}: {
  queryKey: any[];
  updateFn: (old: T) => T;
}) => {
  return queryClient.setQueryData(queryKey, updateFn);
};

// Utility for invalidating queries
export const invalidateQueries = (queryKey: any[]) => {
  return queryClient.invalidateQueries({ queryKey });
};