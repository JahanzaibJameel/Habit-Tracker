'use client';

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
                      variant={viewMode === 'list' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8 w-8 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  
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