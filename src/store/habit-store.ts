import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  Analytics,
  AppState,
  Badge,
  DependencyRule,
  FilterStatus,
  Habit,
  HabitCompletion,
  SortOrder,
  UserPreferences,
  ViewMode,
} from '../types';

interface HabitStore {
  // State
  habits: Habit[];
  completions: HabitCompletion[];
  analytics: Analytics | null;
  badges: Badge[];
  preferences: UserPreferences;
  appState: AppState;

  // UI State
  selectedHabitId: string | null;
  selectedHabitIds: string[];
  sortOrder: SortOrder;
  filterStatus: FilterStatus;
  viewMode: ViewMode;
  showBatchOperations: boolean;
  showDependencies: boolean;
  searchQuery: string;

  // Dependencies
  dependencies: DependencyRule[];

  // Badges
  unlockedBadges: string[];

  // Actions
  // Habit actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  reorderHabits: (habitIds: string[]) => void;

  // Completion actions
  addCompletion: (completion: Omit<HabitCompletion, 'id'>) => void;
  updateCompletion: (id: string, updates: Partial<HabitCompletion>) => void;
  deleteCompletion: (id: string) => void;
  toggleCompletion: (habitId: string, value?: number) => void;

  // Analytics actions
  refreshAnalytics: () => void;

  // Preferences actions
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  // UI actions
  setSelectedHabit: (id: string | null) => void;
  setSelectedHabitIds: (ids: string[]) => void;
  toggleHabitSelection: (id: string) => void;
  selectAllHabits: () => void;
  deselectAllHabits: () => void;
  setSortOrder: (order: SortOrder) => void;
  setFilterStatus: (status: FilterStatus) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setShowBatchOperations: (show: boolean) => void;

  // Batch operations
  batchArchiveHabits: (habitIds: string[]) => void;
  batchDeleteHabits: (habitIds: string[]) => void;
  batchCompleteHabits: (habitIds: string[]) => void;

  // Dependency actions
  addDependency: (dependency: Omit<DependencyRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDependency: (id: string, updates: Partial<DependencyRule>) => void;
  removeDependency: (id: string) => void;
  toggleDependency: (id: string) => void;
  setShowDependencies: (show: boolean) => void;
  checkDependencies: (habitId: string) => { canComplete: boolean; blockedBy: DependencyRule[] };

  // Badge actions
  unlockBadge: (badgeId: string) => void;
  initializeBadges: () => void;
  checkBadgeProgress: (badgeId: string) => { progress: number; isUnlocked: boolean };

  // App state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  updateLastSync: () => void;

  // Computed
  getActiveHabits: () => Habit[];
  getArchivedHabits: () => Habit[];
  getHabitById: (id: string) => Habit | undefined;
  getCompletionsByHabit: (habitId: string) => HabitCompletion[];
  getTodayCompletions: () => HabitCompletion[];
  getFilteredHabits: () => Habit[];
}

// Helper function to calculate simple streak
const calculateSimpleStreak = (completions: HabitCompletion[]): number => {
  if (completions.length === 0) return 0;

  const sortedDates = completions
    .map((c) => new Date(c.completedAt))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const date of sortedDates) {
    const completionDate = new Date(date);
    completionDate.setHours(0, 0, 0, 0);

    if (completionDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  notifications: {
    enabled: true,
    reminders: [],
    quietHours: {
      start: '22:00',
      end: '08:00',
    },
  },
  privacy: {
    shareAnalytics: false,
    publicProfile: false,
    dataRetention: 365,
  },
  ui: {
    compactMode: false,
    showAnimations: true,
    defaultView: 'grid',
    heatmapEnabled: true,
  },
};

export const useHabitStore = create<HabitStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        habits: [],
        completions: [],
        analytics: null,
        badges: [],
        preferences: defaultPreferences,
        appState: {
          isLoading: false,
          error: null,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          lastSync: null,
        },

        // UI state
        selectedHabitId: null,
        selectedHabitIds: [],
        sortOrder: 'position',
        filterStatus: 'all',
        viewMode: 'grid',
        searchQuery: '',
        showBatchOperations: false,
        showDependencies: false,
        dependencies: [],
        unlockedBadges: [],

        // Habit actions
        addHabit: (habitData) =>
          set((state) => {
            const newHabit: Habit = {
              ...habitData,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
              position: state.habits.length,
            };
            state.habits.push(newHabit);
          }),

        updateHabit: (id, updates) =>
          set((state) => {
            const habitIndex = state.habits.findIndex((h) => h.id === id);
            if (habitIndex !== -1) {
              const habit = state.habits[habitIndex];
              if (habit) {
                Object.assign(habit, updates, {
                  updatedAt: new Date(),
                });
              }
            }
          }),

        deleteHabit: (id) =>
          set((state) => {
            state.habits = state.habits.filter((h) => h.id !== id);
            state.completions = state.completions.filter((c) => c.habitId !== id);
          }),

        archiveHabit: (id) =>
          set((state) => {
            const habit = state.habits.find((h) => h.id === id);
            if (habit) {
              habit.archivedAt = new Date();
              habit.updatedAt = new Date();
            }
          }),

        restoreHabit: (id) =>
          set((state) => {
            const habit = state.habits.find((h) => h.id === id);
            if (habit) {
              delete habit.archivedAt;
              habit.updatedAt = new Date();
            }
          }),

        reorderHabits: (habitIds) =>
          set((state) => {
            habitIds.forEach((id, index) => {
              const habit = state.habits.find((h) => h.id === id);
              if (habit) {
                habit.position = index;
                habit.updatedAt = new Date();
              }
            });
          }),

        // Completion actions
        addCompletion: (completionData) =>
          set((state) => {
            const newCompletion: HabitCompletion = {
              ...completionData,
              id: crypto.randomUUID(),
            };
            state.completions.push(newCompletion);
          }),

        updateCompletion: (id, updates) =>
          set((state) => {
            const completionIndex = state.completions.findIndex((c) => c.id === id);
            if (completionIndex !== -1) {
              const completion = state.completions[completionIndex];
              if (completion) {
                Object.assign(completion, updates);
              }
            }
          }),

        deleteCompletion: (id) =>
          set((state) => {
            state.completions = state.completions.filter((c) => c.id !== id);
          }),

        toggleCompletion: (habitId, value = 1) =>
          set((state) => {
            const today = new Date().toDateString();
            const existingCompletion = state.completions.find(
              (c) => c.habitId === habitId && new Date(c.completedAt).toDateString() === today
            );

            if (existingCompletion) {
              state.completions = state.completions.filter((c) => c.id !== existingCompletion.id);
            } else {
              state.completions.push({
                id: crypto.randomUUID(),
                habitId,
                value,
                completedAt: new Date(),
              });
            }
          }),

        // Analytics actions
        refreshAnalytics: () => {
          const { habits, completions } = get();
          // Calculate analytics (simplified)
          const totalCompletions = completions.length;
          const activeHabits = habits.filter((h) => !h.archivedAt);
          const completionRate =
            activeHabits.length > 0
              ? totalCompletions / (activeHabits.length * 30) // Assuming 30 days
              : 0;

          const analytics: Analytics = {
            totalCompletions,
            completionRate,
            averageDaily: totalCompletions / 30,
            bestDay: 'Monday',
            worstDay: 'Sunday',
            monthlyProgress: [],
            categoryBreakdown: [],
          };

          set((state) => {
            state.analytics = analytics;
          });
        },

        // Preferences actions
        updatePreferences: (updates) =>
          set((state) => {
            Object.assign(state.preferences, updates);
          }),

        // UI actions
        setSelectedHabit: (id) =>
          set((state) => {
            state.selectedHabitId = id;
          }),

        setSortOrder: (order) =>
          set((state) => {
            state.sortOrder = order;
          }),

        setFilterStatus: (status) =>
          set((state) => {
            state.filterStatus = status;
          }),

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query;
          }),

        setSelectedHabitIds: (ids) =>
          set((state) => {
            state.selectedHabitIds = ids;
          }),

        toggleHabitSelection: (id) =>
          set((state) => {
            const index = state.selectedHabitIds.indexOf(id);
            if (index > -1) {
              state.selectedHabitIds.splice(index, 1);
            } else {
              state.selectedHabitIds.push(id);
            }
          }),

        selectAllHabits: () =>
          set((state) => {
            state.selectedHabitIds = state.habits.map((h) => h.id);
          }),

        deselectAllHabits: () =>
          set((state) => {
            state.selectedHabitIds = [];
          }),

        setShowBatchOperations: (show) =>
          set((state) => {
            state.showBatchOperations = show;
          }),

        // Batch operations
        batchArchiveHabits: (habitIds) =>
          set((state) => {
            const now = new Date();
            habitIds.forEach((id) => {
              const habit = state.habits.find((h) => h.id === id);
              if (habit) {
                habit.archivedAt = now;
                habit.updatedAt = now;
              }
            });
            state.selectedHabitIds = [];
            state.showBatchOperations = false;
          }),

        batchDeleteHabits: (habitIds) =>
          set((state) => {
            state.habits = state.habits.filter((h) => !habitIds.includes(h.id));
            state.completions = state.completions.filter((c) => !habitIds.includes(c.habitId));
            state.selectedHabitIds = [];
            state.showBatchOperations = false;
          }),

        batchCompleteHabits: (habitIds) =>
          set((state) => {
            const today = new Date();
            habitIds.forEach((habitId) => {
              // Check if already completed today
              const existingCompletion = state.completions.find(
                (c) =>
                  c.habitId === habitId &&
                  new Date(c.completedAt).toDateString() === today.toDateString()
              );

              if (!existingCompletion) {
                const habit = state.habits.find((h) => h.id === habitId);
                state.completions.push({
                  id: crypto.randomUUID(),
                  habitId,
                  value: habit?.target || 1,
                  completedAt: today,
                });
              }
            });
            state.selectedHabitIds = [];
            state.showBatchOperations = false;
          }),

        // Dependency actions
        addDependency: (dependencyData) =>
          set((state) => {
            const newDependency: DependencyRule = {
              ...dependencyData,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            state.dependencies.push(newDependency);
          }),

        updateDependency: (id, updates) =>
          set((state) => {
            const dependencyIndex = state.dependencies.findIndex((d) => d.id === id);
            if (dependencyIndex !== -1) {
              const dependency = state.dependencies[dependencyIndex];
              if (dependency) {
                Object.assign(dependency, updates, {
                  updatedAt: new Date(),
                });
              }
            }
          }),

        removeDependency: (id) =>
          set((state) => {
            state.dependencies = state.dependencies.filter((d) => d.id !== id);
          }),

        toggleDependency: (id) =>
          set((state) => {
            const dependency = state.dependencies.find((d) => d.id === id);
            if (dependency) {
              dependency.isActive = !dependency.isActive;
              dependency.updatedAt = new Date();
            }
          }),

        setShowDependencies: (show) =>
          set((state) => {
            state.showDependencies = show;
          }),

        checkDependencies: (habitId) => {
          const state = get();
          const activeDependencies = state.dependencies.filter(
            (d) => d.isActive && d.targetHabitId === habitId
          );

          const blockedBy: DependencyRule[] = [];

          for (const dependency of activeDependencies) {
            const sourceCompletions = state.completions.filter(
              (c) => c.habitId === dependency.sourceHabitId
            );

            let conditionMet = false;

            switch (dependency.condition) {
              case 'must_complete':
                // Check if source habit is completed today
                conditionMet = sourceCompletions.some(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                break;

              case 'must_not_complete':
                // Check if source habit is NOT completed today
                conditionMet = !sourceCompletions.some(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                break;

              case 'streak_greater':
                // Check if source habit has streak greater than value
                const streak = calculateSimpleStreak(sourceCompletions);
                conditionMet = streak > (dependency.value || 1);
                break;

              case 'streak_equal':
                // Check if source habit has streak equal to value
                const equalStreak = calculateSimpleStreak(sourceCompletions);
                conditionMet = equalStreak === (dependency.value || 1);
                break;

              case 'time_before':
                // Check if source habit was completed before specified time
                const beforeCompletions = sourceCompletions.filter(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                if (beforeCompletions.length > 0 && dependency.timeValue) {
                  const firstCompletion = beforeCompletions[0];
                  if (firstCompletion) {
                    const completionTime = new Date(firstCompletion.completedAt);
                    const [hours, minutes] = dependency.timeValue.split(':').map(Number);
                    const targetTime = new Date();
                    targetTime.setHours(hours || 0, minutes || 0, 0, 0);
                    conditionMet = completionTime.getTime() < targetTime.getTime();
                  }
                }
                break;

              case 'time_after':
                // Check if source habit was completed after specified time
                const afterCompletions = sourceCompletions.filter(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                if (afterCompletions.length > 0 && dependency.timeValue) {
                  const firstCompletion = afterCompletions[0];
                  if (firstCompletion) {
                    const completionTime = new Date(firstCompletion.completedAt);
                    const [hours, minutes] = dependency.timeValue.split(':').map(Number);
                    const targetTime = new Date();
                    targetTime.setHours(hours || 0, minutes || 0, 0, 0);
                    conditionMet = completionTime.getTime() > targetTime.getTime();
                  }
                }
                break;
            }

            if (!conditionMet) {
              blockedBy.push(dependency);
            }
          }

          return {
            canComplete: blockedBy.length === 0,
            blockedBy,
          };
        },

        // App state actions
        setLoading: (loading) =>
          set((state) => {
            state.appState.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.appState.error = error;
          }),

        setOnlineStatus: (isOnline) =>
          set((state) => {
            state.appState.isOnline = isOnline;
          }),

        updateLastSync: () =>
          set((state) => {
            state.appState.lastSync = new Date();
          }),

        // Badge actions
        unlockBadge: (badgeId) =>
          set((state) => {
            if (!state.unlockedBadges.includes(badgeId)) {
              state.unlockedBadges.push(badgeId);
              const badge = state.badges.find((b) => b.id === badgeId);
              if (badge) {
                badge.unlockedAt = new Date();
              }
            }
          }),

        initializeBadges: () =>
          set((state) => {
            // Initialize default badges
            const defaultBadges: Badge[] = [
              {
                id: 'first-habit',
                name: 'First Steps',
                description: 'Create your first habit',
                category: 'milestone',
                rarity: 'common',
                icon: '🎯',
                color: '#10b981',
                requirement: { type: 'special' as const },
                createdAt: new Date(),
              },
              {
                id: 'week-streak',
                name: 'Week Warrior',
                description: 'Maintain a 7-day streak',
                category: 'streak',
                rarity: 'rare',
                icon: '🔥',
                color: '#f59e0b',
                requirement: { type: 'streak_days', value: 7 } as const,
                createdAt: new Date(),
              },
              {
                id: '30-days',
                name: 'Monthly Master',
                description: 'Complete habits for 30 days',
                category: 'milestone',
                rarity: 'epic',
                icon: '🏆',
                color: '#8b5cf6',
                requirement: { type: 'total_completions', value: 30 } as const,
                createdAt: new Date(),
              },
              {
                id: '100-completions',
                name: 'Century Club',
                description: 'Complete 100 habit completions',
                category: 'milestone',
                rarity: 'legendary',
                icon: '💎',
                color: '#fbbf24',
                requirement: { type: 'total_completions', value: 100 } as const,
                createdAt: new Date(),
              },
            ];

            state.badges = defaultBadges;
          }),

        checkBadgeProgress: (badgeId) => {
          const state = get();
          const badge = state.badges.find((b) => b.id === badgeId);
          if (!badge) return { progress: 0, isUnlocked: false };

          const isUnlocked = state.unlockedBadges.includes(badgeId);
          let progress = 0;

          switch (badge.requirement.type) {
            case 'streak_days':
              // Calculate current streak across all habits
              const allCompletions = state.completions;
              const currentStreak = calculateSimpleStreak(allCompletions);
              progress = Math.min((currentStreak / (badge.requirement.value || 1)) * 100, 100);
              break;

            case 'total_completions':
              const totalCompletions = state.completions.length;
              progress = Math.min((totalCompletions / (badge.requirement.value || 1)) * 100, 100);
              break;

            case 'habit_streak':
              // This would need habit-specific streak calculation
              progress = 0; // Placeholder
              break;

            case 'special':
              progress = isUnlocked ? 100 : 0;
              break;
          }

          return { progress, isUnlocked };
        },

        // Computed
        getActiveHabits: () => {
          const state = get();
          return state.habits.filter((h) => !h.archivedAt);
        },

        getArchivedHabits: () => {
          const state = get();
          return state.habits.filter((h) => h.archivedAt);
        },

        getHabitById: (id) => {
          const state = get();
          return state.habits.find((h) => h.id === id);
        },

        getCompletionsByHabit: (habitId) => {
          const state = get();
          return state.completions.filter((c) => c.habitId === habitId);
        },

        getTodayCompletions: () => {
          const state = get();
          const today = new Date().toDateString();
          return state.completions.filter((c) => new Date(c.completedAt).toDateString() === today);
        },

        getFilteredHabits: () => {
          const state = get();
          let filtered = [...state.habits];

          // Filter by status
          if (state.filterStatus === 'active') {
            filtered = filtered.filter((h) => !h.archivedAt);
          } else if (state.filterStatus === 'archived') {
            filtered = filtered.filter((h) => h.archivedAt);
          }

          // Filter by search
          if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(
              (h) =>
                h.name.toLowerCase().includes(query) ||
                h.description?.toLowerCase().includes(query) ||
                h.category.toLowerCase().includes(query) ||
                h.tags.some((tag) => tag.toLowerCase().includes(query))
            );
          }

          // Sort
          filtered.sort((a, b) => {
            switch (state.sortOrder) {
              case 'name':
                return a.name.localeCompare(b.name);
              case 'created':
                return a.createdAt.getTime() - b.createdAt.getTime();
              case 'updated':
                return b.updatedAt.getTime() - a.updatedAt.getTime();
              case 'position':
              default:
                return a.position - b.position;
            }
          });

          return filtered;
        },
      })),
      {
        name: 'habit-store',
        storage: createJSONStorage(() => {
          if (typeof window === 'undefined')
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          return localStorage;
        }),
        partialize: (state) => ({
          habits: state.habits,
          completions: state.completions,
          analytics: state.analytics,
          badges: state.badges,
          preferences: state.preferences,
          selectedHabitId: state.selectedHabitId,
          sortOrder: state.sortOrder,
          filterStatus: state.filterStatus,
          viewMode: state.viewMode,
          dependencies: state.dependencies,
          unlockedBadges: state.unlockedBadges,
        }),
      }
    ),
    { name: 'habit-store' }
  )
);
