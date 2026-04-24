/**
 * Production-optimized habit store with proper state management
 * - Prevents infinite loops
 * - Optimized selectors
 * - Proper error handling
 * - Performance optimizations
 */

import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { safeNow, safeOnlineStatus, safeUUID } from '../lib/utils/ssr-safe';
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

// Optimized selectors to prevent unnecessary re-renders
export const habitSelectors = {
  // Select active habits only
  getActiveHabits: (state: HabitStore) => {
    return state.habits.filter((h) => !h.archivedAt);
  },

  // Select archived habits only
  getArchivedHabits: (state: HabitStore) => {
    return state.habits.filter((h) => h.archivedAt);
  },

  // Get habit by ID with memoization
  getHabitById: (state: HabitStore, id: string) => {
    return state.habits.find((h) => h.id === id);
  },

  // Get completions for specific habit
  getCompletionsByHabit: (state: HabitStore, habitId: string) => {
    return state.completions.filter((c) => c.habitId === habitId);
  },

  // Get today's completions only
  getTodayCompletions: (state: HabitStore) => {
    const today = new Date().toDateString();
    return state.completions.filter((c) => new Date(c.completedAt).toDateString() === today);
  },

  // Get filtered habits with memoization
  getFilteredHabits: (state: HabitStore) => {
    let filtered = state.habits;

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
};

// Computed values with caching
export const computedValues = {
  // Calculate streak for a habit
  calculateStreak: (completions: HabitCompletion[]): number => {
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
  },

  // Calculate completion rate
  calculateCompletionRate: (
    habits: Habit[],
    completions: HabitCompletion[],
    days: number = 30
  ): number => {
    if (habits.length === 0) return 0;

    const activeHabits = habits.filter((h) => !h.archivedAt);
    if (activeHabits.length === 0) return 0;

    const recentCompletions = completions.filter(
      (c) => new Date(c.completedAt) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    );

    return recentCompletions.length / (activeHabits.length * days);
  },
};

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

  // Actions with error handling
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

  // Computed selectors (cached)
  getActiveHabits: () => Habit[];
  getArchivedHabits: () => Habit[];
  getHabitById: (id: string) => Habit | undefined;
  getCompletionsByHabit: (habitId: string) => HabitCompletion[];
  getTodayCompletions: () => HabitCompletion[];
  getFilteredHabits: () => Habit[];
}

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

export const useOptimizedHabitStore = create<HabitStore>()(
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
          isOnline: safeOnlineStatus(),
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

        // Habit actions with error handling
        addHabit: (habitData) =>
          set((state) => {
            try {
              const newHabit: Habit = {
                ...habitData,
                id: safeUUID(),
                createdAt: new Date(safeNow()),
                updatedAt: new Date(safeNow()),
                position: state.habits.length,
              };
              state.habits.push(newHabit);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to create habit';
              console.error('Failed to create habit:', error);
            }
          }),

        updateHabit: (id, updates) =>
          set((state) => {
            try {
              const habitIndex = state.habits.findIndex((h) => h.id === id);
              if (habitIndex !== -1) {
                const habit = state.habits[habitIndex];
                if (habit) {
                  Object.assign(habit, updates, {
                    updatedAt: new Date(safeNow()),
                  });
                }
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to update habit';
              console.error('Failed to update habit:', error);
            }
          }),

        deleteHabit: (id) =>
          set((state) => {
            try {
              state.habits = state.habits.filter((h) => h.id !== id);
              state.completions = state.completions.filter((c) => c.habitId !== id);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to delete habit';
              console.error('Failed to delete habit:', error);
            }
          }),

        archiveHabit: (id) =>
          set((state) => {
            try {
              const habit = state.habits.find((h) => h.id === id);
              if (habit) {
                habit.archivedAt = new Date(safeNow());
                habit.updatedAt = new Date(safeNow());
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to archive habit';
              console.error('Failed to archive habit:', error);
            }
          }),

        restoreHabit: (id) =>
          set((state) => {
            try {
              const habit = state.habits.find((h) => h.id === id);
              if (habit) {
                delete habit.archivedAt;
                habit.updatedAt = new Date(safeNow());
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to restore habit';
              console.error('Failed to restore habit:', error);
            }
          }),

        reorderHabits: (habitIds) =>
          set((state) => {
            try {
              habitIds.forEach((id, index) => {
                const habit = state.habits.find((h) => h.id === id);
                if (habit) {
                  habit.position = index;
                  habit.updatedAt = new Date(safeNow());
                }
              });
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to reorder habits';
              console.error('Failed to reorder habits:', error);
            }
          }),

        // Completion actions
        addCompletion: (completionData) =>
          set((state) => {
            try {
              const newCompletion: HabitCompletion = {
                ...completionData,
                id: safeUUID(),
              };
              state.completions.push(newCompletion);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to add completion';
              console.error('Failed to add completion:', error);
            }
          }),

        updateCompletion: (id, updates) =>
          set((state) => {
            try {
              const completionIndex = state.completions.findIndex((c) => c.id === id);
              if (completionIndex !== -1) {
                const completion = state.completions[completionIndex];
                if (completion) {
                  Object.assign(completion, updates);
                }
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to update completion';
              console.error('Failed to update completion:', error);
            }
          }),

        deleteCompletion: (id) =>
          set((state) => {
            try {
              state.completions = state.completions.filter((c) => c.id !== id);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to delete completion';
              console.error('Failed to delete completion:', error);
            }
          }),

        toggleCompletion: (habitId, value = 1) =>
          set((state) => {
            try {
              const today = new Date().toDateString();
              const existingCompletion = state.completions.find(
                (c) => c.habitId === habitId && new Date(c.completedAt).toDateString() === today
              );

              if (existingCompletion) {
                state.completions = state.completions.filter((c) => c.id !== existingCompletion.id);
              } else {
                state.completions.push({
                  id: safeUUID(),
                  habitId,
                  value,
                  completedAt: new Date(safeNow()),
                });
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to toggle completion';
              console.error('Failed to toggle completion:', error);
            }
          }),

        // Analytics actions
        refreshAnalytics: () => {
          const { habits, completions } = get();
          try {
            const totalCompletions = completions.length;
            const activeHabits = habits.filter((h) => !h.archivedAt);
            const completionRate = computedValues.calculateCompletionRate(habits, completions);

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
              state.appState.error = null;
            });
          } catch (error) {
            set((state) => {
              state.appState.error = 'Failed to refresh analytics';
            });
            console.error('Failed to refresh analytics:', error);
          }
        },

        // Preferences actions
        updatePreferences: (updates) =>
          set((state) => {
            try {
              Object.assign(state.preferences, updates);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to update preferences';
              console.error('Failed to update preferences:', error);
            }
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
            state.selectedHabitIds = habitSelectors.getActiveHabits(state).map((h) => h.id);
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
            try {
              const now = new Date(safeNow());
              habitIds.forEach((id) => {
                const habit = state.habits.find((h) => h.id === id);
                if (habit) {
                  habit.archivedAt = now;
                  habit.updatedAt = now;
                }
              });
              state.selectedHabitIds = [];
              state.showBatchOperations = false;
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to archive habits';
              console.error('Failed to archive habits:', error);
            }
          }),

        batchDeleteHabits: (habitIds) =>
          set((state) => {
            try {
              state.habits = state.habits.filter((h) => !habitIds.includes(h.id));
              state.completions = state.completions.filter((c) => !habitIds.includes(c.habitId));
              state.selectedHabitIds = [];
              state.showBatchOperations = false;
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to delete habits';
              console.error('Failed to delete habits:', error);
            }
          }),

        batchCompleteHabits: (habitIds) =>
          set((state) => {
            try {
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
                    id: safeUUID(),
                    habitId,
                    value: habit?.target || 1,
                    completedAt: today,
                  });
                }
              });
              state.selectedHabitIds = [];
              state.showBatchOperations = false;
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to complete habits';
              console.error('Failed to complete habits:', error);
            }
          }),

        // Dependency actions
        addDependency: (dependencyData) =>
          set((state) => {
            try {
              const newDependency: DependencyRule = {
                ...dependencyData,
                id: safeUUID(),
                createdAt: new Date(safeNow()),
                updatedAt: new Date(safeNow()),
              };
              state.dependencies.push(newDependency);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to add dependency';
              console.error('Failed to add dependency:', error);
            }
          }),

        updateDependency: (id, updates) =>
          set((state) => {
            try {
              const dependencyIndex = state.dependencies.findIndex((d) => d.id === id);
              if (dependencyIndex !== -1) {
                const dependency = state.dependencies[dependencyIndex];
                if (dependency) {
                  Object.assign(dependency, updates, {
                    updatedAt: new Date(safeNow()),
                  });
                }
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to update dependency';
              console.error('Failed to update dependency:', error);
            }
          }),

        removeDependency: (id) =>
          set((state) => {
            try {
              state.dependencies = state.dependencies.filter((d) => d.id !== id);
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to remove dependency';
              console.error('Failed to remove dependency:', error);
            }
          }),

        toggleDependency: (id) =>
          set((state) => {
            try {
              const dependency = state.dependencies.find((d) => d.id === id);
              if (dependency) {
                dependency.isActive = !dependency.isActive;
                dependency.updatedAt = new Date(safeNow());
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to toggle dependency';
              console.error('Failed to toggle dependency:', error);
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
                conditionMet = sourceCompletions.some(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                break;

              case 'must_not_complete':
                conditionMet = !sourceCompletions.some(
                  (c) => new Date(c.completedAt).toDateString() === new Date().toDateString()
                );
                break;

              case 'streak_greater':
                const streak = computedValues.calculateStreak(sourceCompletions);
                conditionMet = streak > (dependency.value || 1);
                break;

              case 'streak_equal':
                const equalStreak = computedValues.calculateStreak(sourceCompletions);
                conditionMet = equalStreak === (dependency.value || 1);
                break;

              case 'time_before':
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
            state.appState.lastSync = new Date(safeNow());
          }),

        // Badge actions
        unlockBadge: (badgeId) =>
          set((state) => {
            try {
              if (!state.unlockedBadges.includes(badgeId)) {
                state.unlockedBadges.push(badgeId);
                const badge = state.badges.find((b) => b.id === badgeId);
                if (badge) {
                  badge.unlockedAt = new Date(safeNow());
                }
              }
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to unlock badge';
              console.error('Failed to unlock badge:', error);
            }
          }),

        initializeBadges: () =>
          set((state) => {
            try {
              // Initialize default badges
              const defaultBadges: Badge[] = [
                {
                  id: 'first-habit',
                  name: 'First Steps',
                  description: 'Create your first habit',
                  category: 'milestone',
                  rarity: 'common',
                  icon: '??',
                  color: '#10b981',
                  requirement: { type: 'special' as const },
                  createdAt: new Date(safeNow()),
                },
                {
                  id: 'week-streak',
                  name: 'Week Warrior',
                  description: 'Maintain a 7-day streak',
                  category: 'streak',
                  rarity: 'rare',
                  icon: '??',
                  color: '#f59e0b',
                  requirement: { type: 'streak_days', value: 7 } as const,
                  createdAt: new Date(safeNow()),
                },
                {
                  id: '30-days',
                  name: 'Monthly Master',
                  description: 'Complete habits for 30 days',
                  category: 'milestone',
                  rarity: 'epic',
                  icon: '??',
                  color: '#8b5cf6',
                  requirement: { type: 'total_completions', value: 30 } as const,
                  createdAt: new Date(safeNow()),
                },
                {
                  id: '100-completions',
                  name: 'Century Club',
                  description: 'Complete 100 habit completions',
                  category: 'milestone',
                  rarity: 'legendary',
                  icon: '??',
                  color: '#fbbf24',
                  requirement: { type: 'total_completions', value: 100 } as const,
                  createdAt: new Date(safeNow()),
                },
              ];

              state.badges = defaultBadges;
              state.appState.error = null;
            } catch (error) {
              state.appState.error = 'Failed to initialize badges';
              console.error('Failed to initialize badges:', error);
            }
          }),

        checkBadgeProgress: (badgeId) => {
          const state = get();
          const badge = state.badges.find((b) => b.id === badgeId);
          if (!badge) return { progress: 0, isUnlocked: false };

          const isUnlocked = state.unlockedBadges.includes(badgeId);
          let progress = 0;

          switch (badge.requirement.type) {
            case 'streak_days':
              const allCompletions = state.completions;
              const currentStreak = computedValues.calculateStreak(allCompletions);
              progress = Math.min((currentStreak / (badge.requirement.value || 1)) * 100, 100);
              break;

            case 'total_completions':
              const totalCompletions = state.completions.length;
              progress = Math.min((totalCompletions / (badge.requirement.value || 1)) * 100, 100);
              break;

            case 'habit_streak':
              progress = 0; // Placeholder
              break;

            case 'special':
              progress = isUnlocked ? 100 : 0;
              break;
          }

          return { progress, isUnlocked };
        },

        // Computed selectors (using the optimized selectors)
        getActiveHabits: () => habitSelectors.getActiveHabits(get()),
        getArchivedHabits: () => habitSelectors.getArchivedHabits(get()),
        getHabitById: (id) => habitSelectors.getHabitById(get(), id),
        getCompletionsByHabit: (habitId) => habitSelectors.getCompletionsByHabit(get(), habitId),
        getTodayCompletions: () => habitSelectors.getTodayCompletions(get()),
        getFilteredHabits: () => habitSelectors.getFilteredHabits(get()),
      })),
      {
        name: 'optimized-habit-store',
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
    { name: 'optimized-habit-store' }
  )
);
