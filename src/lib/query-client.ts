import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create a persister (only on client side)
const persister =
  typeof window !== 'undefined' && typeof localStorage !== 'undefined'
    ? createSyncStoragePersister({
        storage: localStorage,
        key: 'habit-tracker-query-cache',
        serialize: (data) => {
          try {
            return JSON.stringify(data);
          } catch (error) {
            console.error('Failed to serialize query cache:', error);
            return '{}';
          }
        },
        deserialize: (data) => {
          try {
            return JSON.parse(data);
          } catch (error) {
            console.error('Failed to deserialize query cache:', error);
            return {};
          }
        },
      })
    : null;

// Persist query client configuration
export const persistOptions: PersistQueryClientOptions | null =
  typeof window !== 'undefined' && persister
    ? {
        queryClient,
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist queries that have data and are not fetching
            return query.state.status === 'success' && !query.state.isInvalidated;
          },
          shouldDehydrateMutation: (mutation) => {
            // Don't persist mutations
            return false;
          },
        },
        hydrateOptions: {
          defaultOptions: {
            queries: {
              // Don't refetch on mount if we have cached data
              staleTime: 1000 * 60 * 5,
            } as any,
          },
        },
      }
    : null;

// Query keys
export const queryKeys = {
  habits: ['habits'] as const,
  habit: (id: string) => ['habits', id] as const,
  completions: ['completions'] as const,
  completionsByHabit: (habitId: string) => ['completions', 'habit', habitId] as const,
  todayCompletions: ['completions', 'today'] as const,
  analytics: ['analytics'] as const,
  badges: ['badges'] as const,
  preferences: ['preferences'] as const,
  streaks: ['streaks'] as const,
  heatmap: (habitId: string, days: number) => ['heatmap', habitId, days] as const,
  progress: (habitId: string, period: string) => ['progress', habitId, period] as const,
} as const;

// Query invalidation helpers
export const invalidateQueries = {
  habits: () => queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
  habit: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.habit(id) }),
  completions: () => queryClient.invalidateQueries({ queryKey: queryKeys.completions }),
  completionsByHabit: (habitId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.completionsByHabit(habitId) }),
  todayCompletions: () => queryClient.invalidateQueries({ queryKey: queryKeys.todayCompletions }),
  analytics: () => queryClient.invalidateQueries({ queryKey: queryKeys.analytics }),
  badges: () => queryClient.invalidateQueries({ queryKey: queryKeys.badges }),
  preferences: () => queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
  streaks: () => queryClient.invalidateQueries({ queryKey: queryKeys.streaks }),
  heatmap: (habitId: string, days: number) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.heatmap(habitId, days) }),
  progress: (habitId: string, period: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.progress(habitId, period) }),
  all: () => queryClient.invalidateQueries(),
};

// Optimistic update helpers
export const optimisticUpdates = {
  createHabit: async (newHabit: any) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.habits });

    // Snapshot the previous value
    const previousHabits = queryClient.getQueryData(queryKeys.habits);

    // Optimistically update to the new value
    queryClient.setQueryData(queryKeys.habits, (old: any) =>
      old ? [...old, { ...newHabit, id: 'temp-id', createdAt: new Date() }] : [newHabit]
    );

    // Return a context object with the snapshotted value
    return { previousHabits };
  },

  updateHabit: async (id: string, updates: any) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.habits });
    await queryClient.cancelQueries({ queryKey: queryKeys.habit(id) });

    const previousHabits = queryClient.getQueryData(queryKeys.habits);
    const previousHabit = queryClient.getQueryData(queryKeys.habit(id));

    queryClient.setQueryData(queryKeys.habits, (old: any) =>
      old?.map((habit: any) =>
        habit.id === id ? { ...habit, ...updates, updatedAt: new Date() } : habit
      )
    );

    queryClient.setQueryData(queryKeys.habit(id), (old: any) =>
      old ? { ...old, ...updates, updatedAt: new Date() } : null
    );

    return { previousHabits, previousHabit };
  },

  deleteHabit: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.habits });
    await queryClient.cancelQueries({ queryKey: queryKeys.habit(id) });

    const previousHabits = queryClient.getQueryData(queryKeys.habits);
    const previousHabit = queryClient.getQueryData(queryKeys.habit(id));

    queryClient.setQueryData(queryKeys.habits, (old: any) =>
      old?.filter((habit: any) => habit.id !== id)
    );

    queryClient.setQueryData(queryKeys.habit(id), null);

    return { previousHabits, previousHabit };
  },

  toggleCompletion: async (habitId: string, value: number) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.completions });
    await queryClient.cancelQueries({ queryKey: queryKeys.completionsByHabit(habitId) });
    await queryClient.cancelQueries({ queryKey: queryKeys.todayCompletions });

    const previousCompletions = queryClient.getQueryData(queryKeys.completions);
    const previousHabitCompletions = queryClient.getQueryData(
      queryKeys.completionsByHabit(habitId)
    );
    const previousTodayCompletions = queryClient.getQueryData(queryKeys.todayCompletions);

    const today = new Date().toDateString();
    const existingCompletion = (previousHabitCompletions as any[])?.find(
      (c: any) => new Date(c.completedAt).toDateString() === today
    );

    if (existingCompletion) {
      // Remove completion
      queryClient.setQueryData(queryKeys.completions, (old: any) =>
        old?.filter((c: any) => c.id !== existingCompletion.id)
      );
      queryClient.setQueryData(queryKeys.completionsByHabit(habitId), (old: any) =>
        old?.filter((c: any) => c.id !== existingCompletion.id)
      );
      queryClient.setQueryData(queryKeys.todayCompletions, (old: any) =>
        old?.filter((c: any) => c.id !== existingCompletion.id)
      );
    } else {
      // Add completion
      const newCompletion = {
        id: 'temp-id',
        habitId,
        value,
        completedAt: new Date(),
      };

      queryClient.setQueryData(queryKeys.completions, (old: any) =>
        old ? [newCompletion, ...old] : [newCompletion]
      );
      queryClient.setQueryData(queryKeys.completionsByHabit(habitId), (old: any) =>
        old ? [newCompletion, ...old] : [newCompletion]
      );
      queryClient.setQueryData(queryKeys.todayCompletions, (old: any) =>
        old ? [newCompletion, ...old] : [newCompletion]
      );
    }

    return {
      previousCompletions,
      previousHabitCompletions,
      previousTodayCompletions,
    };
  },
};

// Rollback helpers
export const rollbackUpdates = {
  createHabit: (context: any, error: any) => {
    queryClient.setQueryData(queryKeys.habits, context.previousHabits);
    throw error;
  },

  updateHabit: (context: any, error: any) => {
    queryClient.setQueryData(queryKeys.habits, context.previousHabits);
    queryClient.setQueryData(queryKeys.habit(context.id), context.previousHabit);
    throw error;
  },

  deleteHabit: (context: any, error: any) => {
    queryClient.setQueryData(queryKeys.habits, context.previousHabits);
    queryClient.setQueryData(queryKeys.habit(context.id), context.previousHabit);
    throw error;
  },

  toggleCompletion: (context: any, error: any) => {
    queryClient.setQueryData(queryKeys.completions, context.previousCompletions);
    queryClient.setQueryData(
      queryKeys.completionsByHabit(context.habitId),
      context.previousHabitCompletions
    );
    queryClient.setQueryData(queryKeys.todayCompletions, context.previousTodayCompletions);
    throw error;
  },
};

export default queryClient;
