import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { format, isSameDay, parseISO, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { 
  StoreState, 
  Habit, 
  Completion, 
  Analytics, 
  UserPreferences 
} from '@/types/store';

// Default preferences
const defaultPreferences: UserPreferences = {
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
};

// Default analytics
const defaultAnalytics: Analytics = {
  totalHabits: 0,
  activeHabits: 0,
  totalCompletions: 0,
  currentStreak: 0,
  longestStreak: 0,
  completionRate: 0,
  weeklyGoalProgress: 0,
};

// Helper function to get today's date in YYYY-MM-DD format
const getToday = () => format(new Date(), 'yyyy-MM-dd');

export const useStore = create<StoreState>()(
  immer((set, get) => ({
    // Initial state
    habits: [],
    completions: [],
    preferences: defaultPreferences,
    selectedDate: getToday(),
    viewMode: 'daily',
    isLoading: false,
    analytics: defaultAnalytics,
    streaks: new Map(),

    // Habit CRUD Actions
    addHabit: (habitData) =>
      set((state) => {
        const newHabit: Habit = {
          ...habitData,
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
          archived: false,
          tags: habitData.tags || [],
        };
        
        state.habits.push(newHabit);
        state.analytics = get().calculateAnalytics();
      }),

    updateHabit: (id, updates) =>
      set((state) => {
        const habitIndex = state.habits.findIndex((h) => h.id === id);
        if (habitIndex !== -1) {
          state.habits[habitIndex] = {
            ...state.habits[habitIndex],
            ...updates,
            updatedAt: new Date(),
          };
        }
        state.analytics = get().calculateAnalytics();
      }),

    deleteHabit: (id) =>
      set((state) => {
        state.habits = state.habits.filter((h) => h.id !== id);
        state.completions = state.completions.filter((c) => c.habitId !== id);
        state.analytics = get().calculateAnalytics();
      }),

    toggleHabitArchived: (id) =>
      set((state) => {
        const habitIndex = state.habits.findIndex((h) => h.id === id);
        if (habitIndex !== -1) {
          state.habits[habitIndex].archived = !state.habits[habitIndex].archived;
          state.habits[habitIndex].updatedAt = new Date();
        }
        state.analytics = get().calculateAnalytics();
      }),

    // Completion Actions
    toggleCompletion: (habitId, date = getToday()) =>
      set((state) => {
        const existingCompletion = state.completions.find(
          (c) => c.habitId === habitId && c.date === date
        );

        if (existingCompletion) {
          // Toggle existing completion
          existingCompletion.completed = !existingCompletion.completed;
          existingCompletion.timestamp = new Date();
        } else {
          // Create new completion
          const newCompletion: Completion = {
            id: uuidv4(),
            habitId,
            date,
            completed: true,
            timestamp: new Date(),
          };
          state.completions.push(newCompletion);
        }
        
        // Update analytics
        state.analytics = get().calculateAnalytics();
      }),

    setCompletionValue: (habitId, date, value) =>
      set((state) => {
        let completion = state.completions.find(
          (c) => c.habitId === habitId && c.date === date
        );

        if (completion) {
          completion.value = value;
          completion.completed = value > 0;
        } else {
          completion = {
            id: uuidv4(),
            habitId,
            date,
            value,
            completed: value > 0,
            timestamp: new Date(),
          };
          state.completions.push(completion);
        }
      }),

    bulkToggleCompletions: (habitIds, date, completed) =>
      set((state) => {
        const today = new Date().toISOString();
        habitIds.forEach((habitId) => {
          const existingCompletion = state.completions.find(
            (c) => c.habitId === habitId && c.date === date
          );

          if (existingCompletion) {
            existingCompletion.completed = completed;
            existingCompletion.timestamp = new Date();
          } else {
            state.completions.push({
              id: uuidv4(),
              habitId,
              date,
              completed,
              timestamp: new Date(),
            });
          }
        });
        state.analytics = get().calculateAnalytics();
      }),

    // Preferences Actions
    setTheme: (theme) =>
      set((state) => {
        state.preferences.theme = theme;
      }),

    setWeeklyStartDay: (weeklyStartDay) =>
      set((state) => {
        state.preferences.weeklyStartDay = weeklyStartDay;
      }),

    toggleNotifications: () =>
      set((state) => {
        state.preferences.notifications.enabled = !state.preferences.notifications.enabled;
      }),

    updatePreferences: (updates) =>
      set((state) => {
        state.preferences = { ...state.preferences, ...updates };
      }),

    // View Actions
    setSelectedDate: (date) =>
      set((state) => {
        state.selectedDate = date;
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
        state.preferences.defaultView = mode;
      }),

    // Analytics Calculation
    calculateAnalytics: () => {
      const state = get();
      const today = getToday();
      const activeHabits = state.habits.filter(h => !h.archived);
      
      // Calculate streaks
      let longestStreak = 0;
      let currentStreak = 0;
      
      // Simple streak calculation for today
      const sortedCompletions = [...state.completions]
        .filter(c => c.completed)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (sortedCompletions.length > 0) {
        let tempStreak = 1;
        longestStreak = 1;
        
        for (let i = 1; i < sortedCompletions.length; i++) {
          const prevDate = parseISO(sortedCompletions[i - 1].date);
          const currDate = parseISO(sortedCompletions[i].date);
          const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
        }
        
        // Check if last completion was yesterday for current streak
        const lastCompletion = sortedCompletions[sortedCompletions.length - 1];
        const lastCompletionDate = parseISO(lastCompletion.date);
        const yesterday = subDays(new Date(), 1);
        
        if (isSameDay(lastCompletionDate, yesterday) || isSameDay(lastCompletionDate, new Date())) {
          currentStreak = tempStreak;
        }
      }

      // Calculate completion rate for this week
      const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endOfThisWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      const weeklyCompletions = state.completions.filter(c => {
        const date = parseISO(c.date);
        return date >= startOfThisWeek && date <= endOfThisWeek && c.completed;
      });
      
      const totalWeeklyGoal = activeHabits.reduce((sum, habit) => {
        const daysInSchedule = Object.values(habit.schedule).filter(Boolean).length;
        return sum + daysInSchedule;
      }, 0);
      
      const weeklyGoalProgress = totalWeeklyGoal > 0 
        ? (weeklyCompletions.length / totalWeeklyGoal) * 100 
        : 0;

      return {
        totalHabits: state.habits.length,
        activeHabits: activeHabits.length,
        totalCompletions: state.completions.filter(c => c.completed).length,
        currentStreak,
        longestStreak,
        completionRate: activeHabits.length > 0 
          ? (state.completions.filter(c => c.completed).length / (activeHabits.length * 7)) * 100 
          : 0,
        weeklyGoalProgress,
      };
    },

    calculateStreak: (habitId: string) => {
      const state = get();
      const habitCompletions = state.completions
        .filter(c => c.habitId === habitId && c.completed)
        .map(c => parseISO(c.date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (habitCompletions.length === 0) {
        return { current: 0, longest: 0 };
      }
      
      let longestStreak = 1;
      let currentStreak = 1;
      let tempStreak = 1;
      
      for (let i = 1; i < habitCompletions.length; i++) {
        const diffDays = Math.round(
          (habitCompletions[i].getTime() - habitCompletions[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (diffDays === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      
      // Check if last completion contributes to current streak
      const lastCompletion = habitCompletions[habitCompletions.length - 1];
      const yesterday = subDays(new Date(), 1);
      
      if (isSameDay(lastCompletion, yesterday) || isSameDay(lastCompletion, new Date())) {
        currentStreak = tempStreak;
      }
      
      return { current: currentStreak, longest: longestStreak };
    },

    // Utility Actions
    resetStore: () =>
      set(() => ({
        habits: [],
        completions: [],
        preferences: defaultPreferences,
        selectedDate: getToday(),
        viewMode: 'daily',
        analytics: defaultAnalytics,
        streaks: new Map(),
      })),

    importData: (data) =>
      set((state) => {
        state.habits = data.habits;
        state.completions = data.completions;
        state.analytics = get().calculateAnalytics();
      }),
  }))
);

// Custom hooks for derived state
export const useHabits = () => {
  return useStore((state) => state.habits);
};

export const useActiveHabits = () => {
  return useStore((state) => 
    state.habits.filter((habit) => !habit.archived)
  );
};

export const useTodayCompletions = () => {
  const today = getToday();
  return useStore((state) => 
    state.completions.filter((c) => c.date === today)
  );
};

export const useHabitCompletions = (habitId: string) => {
  return useStore((state) => 
    state.completions.filter((c) => c.habitId === habitId)
  );
};

export const usePreferences = () => {
  return useStore((state) => state.preferences);
};

export const useAnalytics = () => {
  return useStore((state) => state.analytics);
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
  }));
};