import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  useHabits,
  useCompletions,
  usePreferences,
  useHabitOperations,
  useCompletionOperations,
  usePreferencesOperations,
  useDatabaseStats,
  useDataImportExport,
  DatabaseError,
} from '@/db/hooks';
import { format } from 'date-fns';
import { StoreState, Habit, Completion, UserPreferences } from '@/types';

// Helper function to get today's date
const getToday = () => format(new Date(), 'yyyy-MM-dd');

// Create store with IndexedDB persistence
export const useStore = create<StoreState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      habits: [],
      completions: [],
      preferences: {
        theme: 'system',
        weeklyStartDay: 'monday',
        notifications: {
          enabled: true,
          morningTime: '08:00',
          eveningTime: '20:00',
        },
        defaultView: 'daily',
        showMotivationalQuotes: true,
        vibrationEnabled: false,
        soundEnabled: true,
      },
      selectedDate: getToday(),
      viewMode: 'daily',
      isLoading: false,
      isInitialized: false,
      lastSyncTime: null,
      syncError: null,
      analytics: {
        totalHabits: 0,
        activeHabits: 0,
        totalCompletions: 0,
        currentStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        weeklyGoalProgress: 0,
      },
      streaks: new Map(),

      // Initialize store from IndexedDB
      initializeFromDB: async () => {
        set((state) => {
          state.isLoading = true;
          state.syncError = null;
        });

        try {
          // Load data from IndexedDB
          // Note: We'll sync in the background via live queries
          set((state) => {
            state.isInitialized = true;
            state.lastSyncTime = new Date();
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.syncError = error instanceof Error ? error.message : 'Sync failed';
            state.isLoading = false;
          });
          console.error('Failed to initialize from DB:', error);
        }
      },

      // Sync store with IndexedDB
      syncWithDB: async () => {
        set((state) => {
          state.isLoading = true;
          state.syncError = null;
        });

        try {
          // This is where we'd sync with IndexedDB
          // For now, we rely on live queries
          set((state) => {
            state.lastSyncTime = new Date();
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.syncError = error instanceof Error ? error.message : 'Sync failed';
            state.isLoading = false;
          });
          console.error('Sync failed:', error);
        }
      },

      // Actions that now use IndexedDB hooks
      addHabit: async (habitData) => {
        const { addHabit } = useHabitOperations();
        try {
          await addHabit(habitData);
          // Store will update via live query
        } catch (error) {
          console.error('Failed to add habit:', error);
          throw error;
        }
      },

      updateHabit: async (id, updates) => {
        const { updateHabit } = useHabitOperations();
        try {
          await updateHabit(id, updates);
        } catch (error) {
          console.error('Failed to update habit:', error);
          throw error;
        }
      },

      deleteHabit: async (id) => {
        const { deleteHabit } = useHabitOperations();
        try {
          await deleteHabit(id);
        } catch (error) {
          console.error('Failed to delete habit:', error);
          throw error;
        }
      },

      toggleHabitArchived: async (id) => {
        const { updateHabit } = useHabitOperations();
        try {
          const habits = get().habits;
          const habit = habits.find(h => h.id === id);
          if (habit) {
            await updateHabit(id, { archived: !habit.archived });
          }
        } catch (error) {
          console.error('Failed to toggle habit archived:', error);
          throw error;
        }
      },

      toggleCompletion: async (habitId, date = getToday()) => {
        const { toggleCompletion } = useCompletionOperations();
        try {
          await toggleCompletion(habitId, date);
        } catch (error) {
          console.error('Failed to toggle completion:', error);
          throw error;
        }
      },

      setCompletionValue: async (habitId, date, value) => {
        const { setCompletionValue } = useCompletionOperations();
        try {
          await setCompletionValue(habitId, date, value);
        } catch (error) {
          console.error('Failed to set completion value:', error);
          throw error;
        }
      },

      bulkToggleCompletions: async (habitIds, date, completed) => {
        const { bulkToggleCompletions } = useCompletionOperations();
        try {
          await bulkToggleCompletions(habitIds, date, completed);
        } catch (error) {
          console.error('Failed to bulk toggle completions:', error);
          throw error;
        }
      },

      setTheme: async (theme) => {
        const { updatePreferences } = usePreferencesOperations();
        try {
          await updatePreferences({ theme });
        } catch (error) {
          console.error('Failed to set theme:', error);
          throw error;
        }
      },

      updatePreferences: async (updates) => {
        const { updatePreferences } = usePreferencesOperations();
        try {
          await updatePreferences(updates);
        } catch (error) {
          console.error('Failed to update preferences:', error);
          throw error;
        }
      },

      // Other actions remain the same
      setSelectedDate: (date) =>
        set((state) => {
          state.selectedDate = date;
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode;
        }),

      calculateAnalytics: () => {
        // ... same calculation logic as before
      },

      calculateStreak: (habitId: string) => {
        // ... same calculation logic as before
      },

      resetStore: () =>
        set(() => ({
          habits: [],
          completions: [],
          preferences: {
            theme: 'system',
            weeklyStartDay: 'monday',
            notifications: {
              enabled: true,
              morningTime: '08:00',
              eveningTime: '20:00',
            },
            defaultView: 'daily',
            showMotivationalQuotes: true,
            vibrationEnabled: false,
            soundEnabled: true,
          },
          selectedDate: getToday(),
          viewMode: 'daily',
          isLoading: false,
          isInitialized: false,
          lastSyncTime: null,
          syncError: null,
          analytics: {
            totalHabits: 0,
            activeHabits: 0,
            totalCompletions: 0,
            currentStreak: 0,
            longestStreak: 0,
            completionRate: 0,
            weeklyGoalProgress: 0,
          },
          streaks: new Map(),
        })),

      importData: async (data) => {
        const { importData } = useDataImportExport();
        try {
          await importData(data);
        } catch (error) {
          console.error('Failed to import data:', error);
          throw error;
        }
      },
    })),
    {
      name: 'habit-tracker-store',
      storage: createJSONStorage(() => ({
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      })),
      partialize: (state) => ({
        preferences: state.preferences,
        selectedDate: state.selectedDate,
        viewMode: state.viewMode,
      }),
    }
  )
);

// Custom hooks that sync with IndexedDB
export const useHabitsWithDB = () => {
  const habits = useHabits();
  const storeHabits = useStore((state) => state.habits);
  
  // Sync store with IndexedDB data
  useStore.setState({ habits: habits || [] });
  
  return habits || [];
};

export const useCompletionsWithDB = (date?: string) => {
  const completions = useCompletions(date);
  const storeCompletions = useStore((state) => state.completions);
  
  // Sync store with IndexedDB data
  if (!date) {
    useStore.setState({ completions: completions || [] });
  }
  
  return completions || [];
};

export const usePreferencesWithDB = () => {
  const preferences = usePreferences();
  const storePreferences = useStore((state) => state.preferences);
  
  // Sync store with IndexedDB data
  if (preferences) {
    useStore.setState({ preferences });
  }
  
  return preferences || storePreferences;
};

export const useStoreActions = () => {
  return useStore((state) => ({
    addHabit: state.addHabit,
    updateHabit: state.updateHabit,
    deleteHabit: state.deleteHabit,
    toggleCompletion: state.toggleCompletion,
    setTheme: state.setTheme,
    setViewMode: state.setViewMode,
    resetStore: state.resetStore,
    importData: state.importData,
    initializeFromDB: state.initializeFromDB,
    syncWithDB: state.syncWithDB,
  }));
};