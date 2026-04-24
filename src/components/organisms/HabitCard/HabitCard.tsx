'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  MoreVertical, 
  Target, 
  Flame, 
  TrendingUp,
  Star,
  Calendar,
  Edit2,
  Trash2,
  Archive,
  ChevronRight,
  Clock,
  BarChart3,
  Sparkles,
  Zap,
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Switch } from '@/components/atoms/Switch/Switch';
import { Tooltip } from '@/components/molecules/Tooltip/Tooltip';
import { Dropdown, MoreDropdown } from '@/components/molecules/Dropdown/Dropdown';
import { useToastHelpers } from '@/components/molecules/Toast/Toast';
import { useToggleCompletion, useDeleteHabit, useUpdateHabit } from '@/lib/hooks/useHabitsQuery';
import { useHabitCompletions } from '@/lib/hooks/useCompletionsQuery';
import { format, isToday, parseISO } from 'date-fns';
import { Progress } from '@/components/atoms/Progress/Progress';
import { RadialProgress } from '@/components/atoms/RadialProgress/RadialProgress';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/molecules/Confetti/Confetti';

interface HabitCardProps {
  habit: Habit;
  onEdit?: () => void;
  onDelete?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export function HabitCard({
  habit,
  onEdit,
  onDelete,
  showDetails = true,
  compact = false,
  showActions = true,
  className,
}: HabitCardProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toast = useToastHelpers();
  const { mutate: toggleCompletion, isLoading: isToggling } = useToggleCompletion();
  const { mutate: deleteHabit, isLoading: isDeleting } = useDeleteHabit();
  const { mutate: updateHabit, isLoading: isUpdating } = useUpdateHabit();
  
  const { data: completions = [], refetch } = useHabitCompletions(habit.id);
  
  // Calculate completion stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCompletion = completions.find(c => c.date === today);
  const isCompletedToday = todayCompletion?.completed || false;
  
  // Calculate weekly progress
  const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = format(new Date(), 'EEEE').toLowerCase();
  const isScheduledToday = habit.schedule[currentDay as keyof typeof habit.schedule];
  
  // Calculate streak
  const calculateStreak = () => {
    if (completions.length === 0) return 0;
    
    const completedDates = completions
      .filter(c => c.completed)
      .map(c => parseISO(c.date))
      .sort((a, b) => b.getTime() - a.getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < completedDates.length; i++) {
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(currentDate.getDate() - streak);
      
      if (format(completedDates[i], 'yyyy-MM-dd') === format(expectedDate, 'yyyy-MM-dd')) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateStreak();
  const completionRate = (completions.filter(c => c.completed).length / 7) * 100; // Last 7 days
  
  const handleToggleCompletion = () => {
    if (isToggling) return;
    
    setIsAnimating(true);
    setShowConfetti(true);
    
    toggleCompletion(
      { habitId: habit.id, date: today },
      {
        onSuccess: () => {
          refetch();
          toast.success(
            isCompletedToday ? 'Habit unmarked' : 'Habit completed!',
            isCompletedToday ? 'Keep up the good work tomorrow!' : `Great job on "${habit.name}"!`
          );
          
          // Trigger confetti animation
          setTimeout(() => setShowConfetti(false), 3000);
          setTimeout(() => setIsAnimating(false), 500);
        },
        onError: (error) => {
          toast.error('Failed to update completion', error.message);
          setIsAnimating(false);
        },
      }
    );
  };
  
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${habit.name}"? This action cannot be undone.`)) {
      deleteHabit(habit.id, {
        onSuccess: () => {
          toast.success('Habit deleted', `"${habit.name}" has been removed.`);
          onDelete?.();
        },
        onError: (error) => {
          toast.error('Failed to delete habit', error.message);
        },
      });
    }
  };
  
  const handleArchive = () => {
    updateHabit(
      { id: habit.id, updates: { archived: !habit.archived } },
      {
        onSuccess: () => {
          toast.success(
            habit.archived ? 'Habit unarchived' : 'Habit archived',
            habit.archived 
              ? `"${habit.name}" is now active again.`
              : `"${habit.name}" has been archived.`
          );
        },
        onError: (error) => {
          toast.error('Failed to update habit', error.message);
        },
      }
    );
  };
  
  const dropdownItems = [
    { label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => onEdit?.() },
    { label: habit.archived ? 'Unarchive' : 'Archive', icon: <Archive className="h-4 w-4" />, onClick: handleArchive },
    { separator: true },
    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: handleDelete, destructive: true },
  ];
  
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
  };
  
  const checkmarkVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    exit: { scale: 0, rotate: 180 },
  };
  
  return (
    <>
      {showConfetti && <Confetti />}
      
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={cardVariants}
        transition={{ duration: 0.3 }}
        className={cn('relative', className)}
      >
        <Card
          className={cn(
            'overflow-hidden transition-all duration-300 hover:shadow-hard',
            isCompletedToday && 'ring-2 ring-success-500 dark:ring-success-400',
            habit.archived && 'opacity-60',
            isAnimating && 'animate-pulse-glow'
          )}
          hoverable
          animate
        >
          {/* Background gradient */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: habit.color }}
          />
          
          <div className="relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all',
                      isCompletedToday && 'shadow-glow-success'
                    )}
                    style={{ backgroundColor: `${habit.color}20` }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
                  >
                    {habit.icon}
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-lg font-semibold">
                        {habit.name}
                      </CardTitle>
                      {habit.archived && (
                        <span className="rounded-full bg-secondary-200 px-2 py-0.5 text-xs font-medium text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
                          Archived
                        </span>
                      )}
                    </div>
                    
                    {habit.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {habit.description}
                      </CardDescription>
                    )}
                    
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <Tooltip content="Current streak">
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                          <Flame className="h-3 w-3" />
                          {currentStreak} days
                        </span>
                      </Tooltip>
                      
                      <Tooltip content="Weekly goal">
                        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          <Target className="h-3 w-3" />
                          {habit.goal}/week
                        </span>
                      </Tooltip>
                      
                      {habit.category && (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {habit.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {showActions && (
                  <div className="flex items-center gap-2">
                    <MoreDropdown items={dropdownItems} />
                    
                    {!compact && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-90'
                        )} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Progress Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Today's Progress
                  </span>
                  <span className="text-sm font-medium">
                    {isCompletedToday ? 'Completed! 🎉' : 'Pending'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {/* Weekly Schedule */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {weekDays.map((day, index) => {
                        const isScheduled = habit.schedule[day as keyof typeof habit.schedule];
                        const isCurrentDay = day === currentDay;
                        
                        return (
                          <Tooltip key={day} content={day.charAt(0).toUpperCase() + day.slice(1)}>
                            <div
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                                isScheduled 
                                  ? isCurrentDay
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                  : 'bg-secondary-100 text-secondary-400 dark:bg-secondary-800 dark:text-secondary-600',
                                isCurrentDay && 'ring-2 ring-primary-300 dark:ring-primary-700'
                              )}
                            >
                              {day.charAt(0).toUpperCase()}
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                    
                    {isScheduledToday ? (
                      <span className="text-xs text-success-600 dark:text-success-400">
                        ✓ Scheduled today
                      </span>
                    ) : (
                      <span className="text-xs text-secondary-500">
                        No schedule today
                      </span>
                    )}
                  </div>
                  
                  {/* Completion Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Weekly Completion
                      </span>
                      <span className="font-medium">{Math.round(completionRate)}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant={isCompletedToday ? "success" : "outline"}
                  size="lg"
                  className={cn(
                    "flex-1 transition-all",
                    isCompletedToday && "shadow-glow-success"
                  )}
                  onClick={handleToggleCompletion}
                  isLoading={isToggling}
                  leftIcon={
                    <motion.div
                      variants={checkmarkVariants}
                      initial="initial"
                      animate={isCompletedToday ? "animate" : "exit"}
                    >
                      {isCompletedToday ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </motion.div>
                  }
                  disabled={!isScheduledToday && !habit.archived}
                  motion
                >
                  {isCompletedToday ? 'Completed' : 'Mark Complete'}
                </Button>
                
                {currentStreak >= 3 && (
                  <Tooltip content={`${currentStreak} day streak!`}>
                    <motion.div
                      className="relative"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <motion.span
                        className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {currentStreak}
                      </motion.span>
                    </motion.div>
                  </Tooltip>
                )}
              </div>
            </CardContent>
            
            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && showDetails && !compact && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="border-t border-secondary-200 pt-4 dark:border-secondary-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-secondary-500" />
                          <span>Created</span>
                        </div>
                        <p className="font-medium">
                          {format(new Date(habit.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="h-4 w-4 text-secondary-500" />
                          <span>Completion Rate</span>
                        </div>
                        <RadialProgress
                          value={completionRate}
                          size={40}
                          strokeWidth={4}
                          className="text-lg font-bold"
                        />
                      </div>
                    </div>
                    
                    {habit.tags && habit.tags.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-medium">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {habit.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-secondary-100 px-3 py-1 text-xs text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Weekly Completion Chart */}
                    <div className="mt-6">
                      <p className="mb-3 text-sm font-medium">This Week</p>
                      <div className="flex gap-1">
                        {Array.from({ length: 7 }).map((_, index) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (6 - index));
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const completion = completions.find(c => c.date === dateStr);
                          const isToday = index === 6;
                          
                          return (
                            <Tooltip
                              key={index}
                              content={`${format(date, 'EEE')}: ${completion?.completed ? '✓' : '✗'}`}
                            >
                              <div
                                className={cn(
                                  'flex-1 rounded-lg p-2 text-center transition-all',
                                  completion?.completed
                                    ? 'bg-success-500 text-white'
                                    : 'bg-secondary-200 dark:bg-secondary-800',
                                  isToday && 'ring-2 ring-primary-500 dark:ring-primary-400'
                                )}
                              >
                                <div className="text-xs font-medium">
                                  {format(date, 'dd')}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {format(date, 'EEE').charAt(0)}
                                </div>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
            
            <CardFooter className="border-t border-secondary-200 pt-4 dark:border-secondary-800">
              <div className="flex w-full items-center justify-between text-xs text-secondary-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {habit.updatedAt === habit.createdAt ? 'New habit' : 'Updated recently'}
                </span>
                {isScheduledToday && !isCompletedToday && (
                  <motion.span
                    className="flex items-center gap-1 text-orange-600 dark:text-orange-400"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Zap className="h-3 w-3" />
                    Due today
                  </motion.span>
                )}
              </div>
            </CardFooter>
          </div>
        </Card>
      </motion.div>
    </>
  );
}

// Skeleton loader for HabitCard
export function HabitCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-secondary-200 dark:bg-secondary-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-secondary-200 dark:bg-secondary-800" />
            <div className="h-3 w-1/2 rounded bg-secondary-200 dark:bg-secondary-800" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-2 w-full rounded bg-secondary-200 dark:bg-secondary-800" />
          <div className="h-2 w-2/3 rounded bg-secondary-200 dark:bg-secondary-800" />
        </div>
        <div className="h-10 rounded-lg bg-secondary-200 dark:bg-secondary-800" />
      </CardContent>
    </Card>
  );
}