'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  Filter,
  Grid,
  Link,
  List,
  Moon,
  Plus,
  Search,
  Sun,
  Trophy,
  WifiOff,
} from 'lucide-react';

import { Button } from '../components/atoms/Button';
import { ConfirmDialog } from '../components/atoms/ConfirmDialog';
import { Input } from '../components/atoms/Input';
import { ToastContainer } from '../components/atoms/Toast';
import { useClipboard, useShare } from '../components/atoms/useSafeClientAPI';
import { DraggableHabitCard } from '../components/molecules/DraggableHabitCard';
import { BadgesModal } from '../components/organisms/BadgesModal';
import { BatchOperations } from '../components/organisms/BatchOperations';
import { HabitDependencies } from '../components/organisms/HabitDependencies';
import { HabitForm } from '../components/organisms/HabitForm';
import type { CreateHabit } from '../contracts/habit-schema';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
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
    preferences,
    updatePreferences,
    reorderHabits,
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

  const { activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useDragAndDrop({
    items: filteredHabits,
    onReorder: (reorderedItems) => {
      const habitIds = reorderedItems.map((habit) => habit.id);
      reorderHabits(habitIds);
    },
  });

  const handleCreateHabit = useCallback(
    async (data: CreateHabit | any) => {
      setIsLoading(true);
      try {
        addHabit(data);
        setActivePanel('habits');
        setShowHabitForm(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create habit:', error);
        }

        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.error('Failed to create habit. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addHabit]
  );

  const handleUpdateHabit = useCallback(
    async (data: CreateHabit | any) => {
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

        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.error('Failed to update habit. Please try again.');
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
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('Habit deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete habit:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to delete habit');
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
        if (!success && typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.error('Failed to share habit');
        }
        return;
      }

      const success = await copyToClipboard(shareData.text);
      if (success && typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('Habit details copied to clipboard!');
      } else if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to copy to clipboard');
      }
    },
    [completions, copyToClipboard, shareNative, shareSupported]
  );

  const toggleTheme = useCallback(() => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: newTheme });
  }, [preferences.theme, updatePreferences]);

  const isHabitCompletedToday = useCallback(
    (habitId: string) => todayCompletions.some((completion) => completion.habitId === habitId),
    [todayCompletions]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold">Habit Tracker</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{filteredHabits.length} habits</span>
                <span aria-hidden="true">&middot;</span>
                <span>{todayCompletions.length} completed today</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedHabitIds.length > 0 && (
              <div className="mr-4 hidden items-center space-x-2 lg:flex">
                <span className="text-sm text-muted-foreground">
                  {selectedHabitIds.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowBatchOperations(true)}>
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
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              {preferences.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-8 sm:grid sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-8">
        <aside data-testid="sidebar" className="mb-6 sm:mb-0">
          <div className="sticky top-24 space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold">Workspace</p>
              <p className="text-sm text-muted-foreground">
                Switch between planning and progress views.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                type="button"
                variant={activePanel === 'habits' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setActivePanel('habits')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Habits
              </Button>
              <Button
                type="button"
                variant={activePanel === 'analytics' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setActivePanel('analytics')}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              <p>{analyticsSummary.activeHabits.length} active habits</p>
              <p>{analyticsSummary.completedTodayIds.size} completed today</p>
            </div>
          </div>
        </aside>

        <main data-testid="main-content" className="space-y-6">
          {!appState.isOnline && (
            <div
              data-testid="error-message"
              className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Connection lost</p>
                  <p className="text-sm">
                    {appState.error ?? 'You are offline. Your local data is still available.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                data-testid="retry-button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="sm:hidden"
                data-testid="mobile-menu"
              >
                <List className="mr-2 h-4 w-4" />
                Menu
              </Button>
              <Button
                type="button"
                variant={activePanel === 'habits' ? 'default' : 'outline'}
                onClick={() => setActivePanel('habits')}
              >
                Habits
              </Button>
              <Button
                type="button"
                id="analytics-tab"
                data-testid="analytics-tab"
                variant={activePanel === 'analytics' ? 'default' : 'outline'}
                onClick={() => setActivePanel('analytics')}
              >
                Analytics
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setEditingHabit(null);
                  setShowHabitForm(true);
                }}
                className="flex items-center space-x-2"
                data-testid="add-habit-button"
              >
                <Plus className="h-4 w-4" />
                <span>Add Habit</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDependencies(true)}
                className="flex items-center space-x-2"
              >
                <Link className="h-4 w-4" />
                <span>Dependencies</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBadges(true)}
                className="flex items-center space-x-2"
              >
                <Trophy className="h-4 w-4" />
                <span>Badges</span>
              </Button>
            </div>
          </div>

          {activePanel === 'habits' ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center space-x-2">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search habits..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="icon" type="button" aria-label="Filter habits">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center rounded-md border">
                    <Button
                      type="button"
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Grid, 
  List, 
  Filter, 
  Search, 
  Trophy,
  TrendingUp,
  Target,
  Sparkles,
  Calendar,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/molecules/Modal/Modal';
import { Tabs, TabList, TabItem, TabPanels, TabPanel } from '@/components/molecules/Tabs/Tabs';
import { HabitCard, HabitCardSkeleton } from '@/components/organisms/HabitCard/HabitCard';
import { HabitForm } from '@/components/organisms/HabitForm/HabitForm';
import { useHabits } from '@/lib/hooks/useHabitsQuery';
import { useAnalytics } from '@/lib/hooks/useAnalyticsQuery';
import { useToastHelpers } from '@/components/molecules/Toast/Toast';
import { ToastProvider } from '@/components/molecules/Toast/Toast';
import type { Habit } from '@/types';

export default function Home() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived' | 'today'>('all');
  
  const { data: habits = [], isLoading, refetch } = useHabits();
  const { data: analytics, isLoading: isLoadingAnalytics } = useAnalytics();
  const toast = useToastHelpers();
  
  // Filter and search habits
  const filteredHabits = habits.filter(habit => {
    const matchesSearch = habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         habit.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'active' ? !habit.archived :
      filter === 'archived' ? habit.archived :
      filter === 'today' ? !habit.archived : true;
    
    return matchesSearch && matchesFilter;
  });
  
  const activeHabits = habits.filter(h => !h.archived);
  const archivedHabits = habits.filter(h => h.archived);
  
  const handleEditHabit = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsFormModalOpen(true);
  };
  
  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setSelectedHabit(undefined);
    refetch();
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 p-2">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  10/10 Habit Tracker
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Day 6: Habit Cards & Forms
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setSelectedHabit(undefined);
                  setIsFormModalOpen(true);
                }}
                motion
              >
                New Habit
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Stats Dashboard */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Habits</p>
                      <p className="text-3xl font-bold mt-2">
                        {isLoadingAnalytics ? '...' : analytics?.activeHabits || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                      <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                      <p className="text-3xl font-bold mt-2">
                        {isLoadingAnalytics ? '...' : analytics?.currentStreak || 0} days
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-900">
                      <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                      <p className="text-3xl font-bold mt-2">
                        {isLoadingAnalytics ? '...' : Math.round(analytics?.completionRate || 0)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                      <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Progress</p>
                      <p className="text-3xl font-bold mt-2">
                        {isLoadingAnalytics ? '...' : Math.round(analytics?.weeklyGoalProgress || 0)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                      <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search habits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    className="max-w-md"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-8 w-8 p-0"
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
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted p-6">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold">No habits found</h2>
                    <p className="mb-6 max-w-md text-muted-foreground">
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
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Your First Habit</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <DndContext
                    collisionDetection={closestCenter}
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredHabits.map((habit) => habit.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        className={cn(
                          'grid gap-4',
                          viewMode === 'grid'
                            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                            : 'grid-cols-1'
                        )}
                      >
                        <AnimatePresence>
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
                                className={cn(activeId === habit.id && 'z-10')}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </>
          ) : (
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div
                  data-testid="completion-rate"
                  className="rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="mt-3 text-3xl font-bold">{analyticsSummary.completionRate}%</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {analyticsSummary.completedTodayIds.size} of{' '}
                    {analyticsSummary.activeHabits.length || 0} habits completed today
                  </p>
                </div>

                <div
                  data-testid="habit-streaks"
                  className="rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <p className="text-sm text-muted-foreground">Best Current Streak</p>
                  <p className="mt-3 text-3xl font-bold">{analyticsSummary.longestStreak}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    days across your active habits
                  </p>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Completions</p>
                  <p className="mt-3 text-3xl font-bold">
                    {analytics?.totalCompletions ?? completions.length}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">tracked in this workspace</p>
                </div>
              </div>

              <div
                data-testid="category-breakdown"
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Category Breakdown</h2>
                    <p className="text-sm text-muted-foreground">
                      Where your consistency is stacking up.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {analyticsSummary.categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Create a habit to start seeing analytics.
                    </p>
                  ) : (
                    analyticsSummary.categoryBreakdown.map((category) => (
                      <div
                        key={category.category}
                        className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium capitalize">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.habits} habit(s)
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{category.completions} completions</p>
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
                  
                  <Tabs>
                    <TabList>
                      <TabItem>All ({habits.length})</TabItem>
                      <TabItem>Active ({activeHabits.length})</TabItem>
                      <TabItem>Archived ({archivedHabits.length})</TabItem>
                    </TabList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Habits Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <HabitCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredHabits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-6 rounded-full bg-gray-100 p-8 dark:bg-gray-800">
              <Calendar className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="mb-2 text-2xl font-bold">No habits found</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first habit to get started!'}
            </p>
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsFormModalOpen(true)}
              motion
            >
              Create Your First Habit
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}
          >
            {filteredHabits.map((habit, index) => (
              <motion.div
                key={habit.id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <HabitCard
                  habit={habit}
                  onEdit={() => handleEditHabit(habit)}
                  compact={viewMode === 'list'}
                  showDetails={viewMode === 'grid'}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {/* Empty state encouragement */}
        {!isLoading && habits.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 rounded-2xl bg-gradient-to-r from-primary-500/10 to-purple-500/10 p-8 text-center"
          >
            <h3 className="mb-3 text-2xl font-bold">Ready to build amazing habits?</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Start your journey today. Small habits done consistently lead to remarkable results over time.
            </p>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Sparkles className="h-5 w-5" />}
              onClick={() => setIsFormModalOpen(true)}
              motion
              className="shadow-lg"
            >
              Start Building Habits
            </Button>
          </motion.div>
        )}
      </main>
      
      {/* Habit Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedHabit(undefined);
        }}
        title={selectedHabit ? 'Edit Habit' : 'Create New Habit'}
        description={selectedHabit ? 'Update your habit details' : 'Add a new habit to track'}
        size="xl"
      >
        <HabitForm
          habit={selectedHabit}
          mode={selectedHabit ? 'edit' : 'create'}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormModalOpen(false);
            setSelectedHabit(undefined);
          }}
        />
      </Modal>
    </div>
  );
}

// Wrap with ToastProvider
export default function HomePage() {
  return (
    <ToastProvider>
      <Home />
    </ToastProvider>
  );
}
