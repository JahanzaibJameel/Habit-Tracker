'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

import { Button } from '../components/atoms/Button';
import { ConfirmDialog } from '../components/atoms/ConfirmDialog';
import { Input } from '../components/atoms/Input';
import { ToastContainer } from '../components/atoms/Toast';
import { useClipboard, useShare } from '../components/atoms/useSafeClientAPI';
import { DraggableHabitCard } from '../components/molecules/DraggableHabitCard';

// Dynamic imports for heavy components
const BadgesModal = dynamic(
  () => import('../components/organisms/BadgesModal').then((mod) => ({ default: mod.BadgesModal })),
  {
    loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />,
    ssr: false,
  }
);

const BatchOperations = dynamic(
  () =>
    import('../components/organisms/BatchOperations').then((mod) => ({
      default: mod.BatchOperations,
    })),
  {
    loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />,
    ssr: false,
  }
);

const HabitDependencies = dynamic(
  () =>
    import('../components/organisms/HabitDependencies').then((mod) => ({
      default: mod.HabitDependencies,
    })),
  {
    loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />,
    ssr: false,
  }
);

import {
  BarChart3,
  Calendar,
  Check,
  Filter,
  Grid,
  Link,
  List,
  Moon,
  Plus,
  Search,
  Sun,
  Trophy,
  TrendingUp,
  WifiOff,
} from 'lucide-react';

const HabitForm = dynamic(
  () => import('../components/organisms/HabitForm').then((mod) => ({ default: mod.HabitForm })),
  {
    loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />,
    ssr: false,
  }
);
import type { CreateHabit, UpdateHabit } from '../contracts/habit-types';
import { calculateStreak } from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { useHabitStore } from '../store/habit-store';
import type { Habit } from '../types';

type ActivePanel = 'habits' | 'analytics';

type AnalyticsCategory = {
  category: string;
  completions: number;
  habits: number;
};

export default function HomePage() {
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('habits');
  const [deleteConfirm, setDeleteConfirm] = useState<{ habitId: string; habitName: string } | null>(
    null
  );

  const {
    habits,
    completions,
    analytics,
    appState,
    getFilteredHabits,
    getTodayCompletions,
    addHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    toggleCompletion,
    setSearchQuery: setStoreSearchQuery,
    viewMode,
    setViewMode,
    updatePreferences,
    selectedHabitIds,
    toggleHabitSelection,
    selectAllHabits,
    deselectAllHabits,
    setShowBatchOperations,
    showBatchOperations,
    batchArchiveHabits,
    batchDeleteHabits,
    batchCompleteHabits,
    dependencies,
    addDependency,
    updateDependency,
    removeDependency,
    toggleDependency,
    setShowDependencies,
    showDependencies,
    badges,
    unlockedBadges,
    unlockBadge,
    initializeBadges,
    refreshAnalytics,
    setError,
    setOnlineStatus,
  } = useHabitStore();

  const filteredHabits = getFilteredHabits();
  const todayCompletions = getTodayCompletions();

  const analyticsSummary = useMemo(() => {
    const activeHabits = habits.filter((habit) => !habit.archivedAt);
    const completedTodayIds = new Set(todayCompletions.map((completion) => completion.habitId));
    const longestStreak = activeHabits.reduce((maxStreak, habit) => {
      const habitCompletions = completions.filter((completion) => completion.habitId === habit.id);
      return Math.max(maxStreak, calculateStreak(habitCompletions));
    }, 0);

    const categoryMap = activeHabits.reduce<Map<string, AnalyticsCategory>>((map, habit) => {
      const key = habit.category || 'other';
      const existing = map.get(key) ?? { category: key, completions: 0, habits: 0 };
      existing.habits += 1;
      existing.completions += completions.filter(
        (completion) => completion.habitId === habit.id
      ).length;
      map.set(key, existing);
      return map;
    }, new Map());

    const categoryBreakdown = Array.from(categoryMap.values()).sort((left, right) => {
      if (right.completions !== left.completions) {
        return right.completions - left.completions;
      }

      return left.category.localeCompare(right.category);
    });

    const completionRate =
      activeHabits.length === 0
        ? 0
        : Math.round((completedTodayIds.size / activeHabits.length) * 100);

    return {
      activeHabits,
      completedTodayIds,
      longestStreak,
      completionRate,
      categoryBreakdown,
    };
  }, [completions, habits, todayCompletions]);

  useEffect(() => {
    initializeBadges();
  }, [initializeBadges]);

  useEffect(() => {
    refreshAnalytics();
  }, [completions, habits, refreshAnalytics]);

  useEffect(() => {
    setStoreSearchQuery(searchQuery);
  }, [searchQuery, setStoreSearchQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncConnectionState = () => {
      const online = window.navigator.onLine;
      setOnlineStatus(online);
      setError(
        online ? null : 'You are offline. Changes stay local until your connection returns.'
      );
    };

    syncConnectionState();
    window.addEventListener('online', syncConnectionState);
    window.addEventListener('offline', syncConnectionState);

    return () => {
      window.removeEventListener('online', syncConnectionState);
      window.removeEventListener('offline', syncConnectionState);
    };
  }, [setError, setOnlineStatus]);

  const handleCreateHabit = useCallback(
    (data: CreateHabit | UpdateHabit) => {
      setIsLoading(true);
      try {
        addHabit(data as Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>);
        setActivePanel('habits');
        setShowHabitForm(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create habit:', error);
        }

        if (typeof window !== 'undefined') {
          const windowWithToast = window as Window & {
            toast?: { error: (message: string) => void };
          };
          if (windowWithToast.toast) {
            windowWithToast.toast.error('Failed to create habit. Please try again.');
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addHabit]
  );

  const handleUpdateHabit = useCallback(
    (data: CreateHabit | UpdateHabit) => {
      if (!editingHabit) {
        return;
      }

      setIsLoading(true);
      try {
        updateHabit(editingHabit.id, data);
        setActivePanel('habits');
        setEditingHabit(null);
        setShowHabitForm(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update habit:', error);
        }

        if (typeof window !== 'undefined') {
          const windowWithToast = window as Window & {
            toast?: { error: (message: string) => void };
          };
          if (windowWithToast.toast) {
            windowWithToast.toast.error('Failed to update habit. Please try again.');
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [editingHabit, updateHabit]
  );

  const handleDeleteHabit = useCallback(
    async (habitId: string) => {
      if (!habitId) {
        return;
      }

      const habit = habits.find((item) => item.id === habitId);
      if (!habit) {
        return;
      }

      setDeleteConfirm({ habitId, habitName: habit.name || 'Unknown Habit' });
    },
    [habits]
  );

  const confirmDeleteHabit = useCallback(async () => {
    if (!deleteConfirm) {
      return;
    }

    setIsLoading(true);
    try {
      deleteHabit(deleteConfirm.habitId);
      if (typeof window !== 'undefined') {
        const windowWithToast = window as Window & {
          toast?: { success: (message: string) => void };
        };
        if (windowWithToast.toast) {
          windowWithToast.toast.success('Habit deleted successfully');
        }
      }
    } catch (error) {
      console.error('Failed to delete habit:', error);
      if (typeof window !== 'undefined') {
        const windowWithToast = window as Window & { toast?: { error: (message: string) => void } };
        if (windowWithToast.toast) {
          windowWithToast.toast.error('Failed to delete habit. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deleteHabit]);

  const handleArchiveHabit = useCallback(
    async (habitId: string) => {
      if (!habitId) {
        return;
      }

      setIsLoading(true);
      try {
        archiveHabit(habitId);
      } catch (error) {
        console.error('Failed to archive habit:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [archiveHabit]
  );

  const { share: shareNative, isSupported: shareSupported } = useShare();
  const { copyToClipboard } = useClipboard();

  const handleShareHabit = useCallback(
    async (habit: Habit) => {
      if (!habit.id) {
        return;
      }

      const habitCompletions = completions.filter((completion) => completion.habitId === habit.id);
      const shareData = {
        title: habit.name || 'My Habit',
        text: `Check out my habit: ${habit.name || 'My Habit'}! I've completed ${habitCompletions.length} times.`,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };

      if (shareSupported) {
        const success = await shareNative(shareData);
        if (!success && typeof window !== 'undefined') {
          const windowWithToast = window as Window & {
            toast?: { error: (message: string) => void };
          };
          if (windowWithToast.toast) {
            windowWithToast.toast.error('Failed to share habit');
          }
        }
        return;
      }

      const success = await copyToClipboard(shareData.text);
      if (success && typeof window !== 'undefined') {
        const windowWithToast = window as Window & {
          toast?: { success: (message: string) => void };
        };
        if (windowWithToast.toast) {
          windowWithToast.toast.success('Habit details copied to clipboard!');
        }
      } else if (typeof window !== 'undefined') {
        const windowWithToast = window as Window & { toast?: { error: (message: string) => void } };
        if (windowWithToast.toast) {
          windowWithToast.toast.error('Failed to copy to clipboard');
        }
      }
    },
    [completions, copyToClipboard, shareNative, shareSupported]
  );

  const { theme, setTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    updatePreferences({ theme: newTheme });
  }, [theme, setTheme, updatePreferences]);

  const isHabitCompletedToday = useCallback(
    (habitId: string) => todayCompletions.some((completion) => completion.habitId === habitId),
    [todayCompletions]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Modern Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-slate-800/90">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Habit Tracker
              </h1>
              <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">{filteredHabits.length} habits</span>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span className="font-medium">{todayCompletions.length} completed today</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {selectedHabitIds.length > 0 && (
              <div className="mr-4 hidden items-center space-x-2 lg:flex">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedHabitIds.length} selected
                </span>
                <Button variant="secondary" size="sm" onClick={() => setShowBatchOperations(true)}>
                  Batch Actions
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllHabits}>
                  Clear
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-8 sm:grid sm:grid-cols-[280px_minmax(0,1fr)] sm:gap-8">
        {/* Modern Sidebar */}
        <aside data-testid="sidebar" className="mb-6 sm:mb-0">
          <div className="sticky top-24 space-y-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Workspace
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                Switch between planning and progress views.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                type="button"
                variant={activePanel === 'habits' ? 'default' : 'secondary'}
                className="w-full justify-start"
                onClick={() => setActivePanel('habits')}
              >
                <Calendar className="mr-3 h-4 w-4" />
                Habits
              </Button>
              <Button
                type="button"
                variant={activePanel === 'analytics' ? 'default' : 'secondary'}
                className="w-full justify-start"
                onClick={() => setActivePanel('analytics')}
              >
                <BarChart3 className="mr-3 h-4 w-4" />
                Analytics
              </Button>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Active Habits
                </span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {analyticsSummary.activeHabits.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Completed Today
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {analyticsSummary.completedTodayIds.size}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <main data-testid="main-content" className="space-y-6">
          {!appState.isOnline && (
            <div
              data-testid="error-message"
              className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/30 p-6 text-amber-900 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <WifiOff className="mt-1 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    Connection lost
                  </p>
                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                    {appState.error ?? 'You are offline. Your local data is still available.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                data-testid="retry-button"
                onClick={() => {
                  if (typeof window === 'undefined') {
                    return;
                  }
                  window.location.reload();
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={activePanel === 'habits' ? 'default' : 'secondary'}
                onClick={() => setActivePanel('habits')}
                className="px-6"
              >
                Habits
              </Button>
              <Button
                type="button"
                id="analytics-tab"
                data-testid="analytics-tab"
                variant={activePanel === 'analytics' ? 'default' : 'secondary'}
                onClick={() => setActivePanel('analytics')}
                className="px-6"
              >
                Analytics
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  setEditingHabit(null);
                  setShowHabitForm(true);
                }}
                className="flex items-center gap-2"
                data-testid="add-habit-button"
              >
                <Plus className="h-4 w-4" />
                <span>Add Habit</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDependencies(true)}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                <span>Dependencies</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                <span>Badges</span>
              </Button>
            </div>
          </div>

          {activePanel === 'habits' ? (
            <>
              {/* Search and Filter Bar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      placeholder="Search habits..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-11"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    aria-label="Filter habits"
                    className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                    <Button
                      type="button"
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none border-r border-slate-300 dark:border-slate-600"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div data-testid="habit-list">
                {filteredHabits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 py-20 text-center">
                    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
                      <Calendar className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      No habits found
                    </h2>
                    <p className="mb-8 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                      {searchQuery
                        ? 'No habits match your search. Try different keywords.'
                        : 'Start building better habits by creating your first habit.'}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => {
                          setEditingHabit(null);
                          setShowHabitForm(true);
                        }}
                        className="flex items-center gap-3 px-8 py-3"
                        size="lg"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Create Your First Habit</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'grid gap-4',
                      viewMode === 'grid'
                        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                        : 'grid-cols-1'
                    )}
                  >
                    {filteredHabits.map((habit) => {
                      const habitCompletions = completions.filter(
                        (completion) => completion.habitId === habit.id
                      );

                      return (
                        <DraggableHabitCard
                          key={habit.id}
                          habit={habit}
                          completions={habitCompletions}
                          isCompleted={isHabitCompletedToday(habit.id)}
                          isSelected={selectedHabitIds.includes(habit.id)}
                          onToggleComplete={toggleCompletion}
                          onEdit={(selectedHabit) => {
                            setEditingHabit(selectedHabit);
                            setShowHabitForm(true);
                          }}
                          onArchive={handleArchiveHabit}
                          onDelete={handleDeleteHabit}
                          onShare={handleShareHabit}
                          onToggleSelection={toggleHabitSelection}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <section className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Active Habits
                    </p>
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analyticsSummary.activeHabits.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">being tracked</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Current Streak
                    </p>
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analyticsSummary.longestStreak}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">days in a row</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Completion Rate
                    </p>
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analyticsSummary.completionRate}%
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">today</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total Completions
                    </p>
                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analytics?.totalCompletions ?? completions.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    tracked in this workspace
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div
                data-testid="category-breakdown"
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Category Breakdown
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                      Where your consistency is stacking up.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {analyticsSummary.categoryBreakdown.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600 dark:text-slate-400">
                        Create a habit to start seeing analytics.
                      </p>
                    </div>
                  ) : (
                    analyticsSummary.categoryBreakdown.map((category) => (
                      <div
                        key={category.category}
                        className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/50 px-6 py-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div>
                          <p className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                            {category.category}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {category.habits} habit{category.habits !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {category.completions}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            completion{category.completions !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <HabitForm
        isOpen={showHabitForm}
        onClose={() => {
          setShowHabitForm(false);
          setEditingHabit(null);
        }}
        onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
        habit={editingHabit}
        isLoading={isLoading}
      />

      <BatchOperations
        isOpen={showBatchOperations}
        onClose={() => setShowBatchOperations(false)}
        selectedHabitIds={selectedHabitIds}
        habits={filteredHabits}
        onSelectAll={selectAllHabits}
        onDeselectAll={deselectAllHabits}
        onBatchArchive={batchArchiveHabits}
        onBatchDelete={batchDeleteHabits}
        onBatchComplete={batchCompleteHabits}
        onHabitSelection={toggleHabitSelection}
      />

      <HabitDependencies
        isOpen={showDependencies}
        onClose={() => setShowDependencies(false)}
        habits={filteredHabits}
        dependencies={dependencies}
        onAddDependency={addDependency}
        onRemoveDependency={removeDependency}
        onToggleDependency={toggleDependency}
        onUpdateDependency={updateDependency}
      />

      <BadgesModal
        isOpen={showBadges}
        onClose={() => setShowBadges(false)}
        badges={badges}
        unlockedBadges={unlockedBadges}
        onUnlockBadge={unlockBadge}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteHabit}
        title="Delete Habit"
        message={`Are you sure you want to delete "${deleteConfirm?.habitName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ToastContainer />
    </div>
  );
}
