import React, { useEffect, useState } from 'react';
import {
  Archive,
  Calendar,
  Check,
  Edit,
  MoreVertical,
  Share2,
  Trash2,
  TrendingUp,
} from 'lucide-react';

import { useAnimationState } from '../../hooks/useAnimationState';
import { calculateCompletionRate, calculateStreak, getTodayCompletions } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';
import type { Habit, HabitCompletion } from '../../types';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card, CardContent } from '../atoms/Card';
import { Dropdown } from '../atoms/Dropdown';

interface HabitCardProps {
  habit: Habit;
  completions: HabitCompletion[];
  isCompleted: boolean;
  onToggleComplete: (habitId: string, value?: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onShare: (habit: Habit) => void;
  className?: string;
}

const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  completions,
  isCompleted,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  onShare,
  className,
}) => {
  const [showActions, setShowActions] = useState(false);
  const { isAnimating, startAnimation, cleanup } = useAnimationState(600);

  const todayCompletions = getTodayCompletions(completions || []);
  const currentStreak = calculateStreak(completions || []);
  const completionRate = calculateCompletionRate(
    completions || [],
    habit.createdAt,
    habit.frequency
  );

  const handleToggleComplete = () => {
    startAnimation();
    onToggleComplete(habit.id, habit.target || 1);
  };

  useEffect(() => cleanup, [cleanup]);

  return (
    <div className={cn('relative', className || '')}>
      <Card className="h-full hover:shadow-lg transition-all duration-200">
        <CardContent className="space-y-6 p-6">
          {/* Header with icon and actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center space-x-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-xl text-white shadow-sm"
                style={{ backgroundColor: habit.color || 'hsl(217.2, 91.2%, 59.8%)' }}
              >
                {habit.icon || '🎯'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {habit.name || 'Untitled Habit'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" size="sm">
                    {habit.category || 'General'}
                  </Badge>
                  {habit.frequency && (
                    <Badge variant="outline" size="sm">
                      {habit.frequency}
                    </Badge>
                  )}
                </div>
                {habit.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {habit.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${habit.name}`}
                data-testid={`edit-habit-${habit.name}`}
                onClick={() => onEdit(habit)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Dropdown
                isOpen={showActions}
                onOpenChange={setShowActions}
                placement="bottom-right"
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 text-slate-700 dark:text-slate-200"
                  onClick={() => {
                    onShare(habit);
                    setShowActions(false);
                  }}
                >
                  <Share2 className="mr-3 h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  onClick={() => {
                    onArchive(habit.id);
                    setShowActions(false);
                  }}
                >
                  <Archive className="mr-3 h-4 w-4" />
                  Archive
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                  onClick={() => {
                    onDelete(habit.id);
                    setShowActions(false);
                  }}
                >
                  <Trash2 className="mr-3 h-4 w-4" />
                  Delete
                </Button>
              </Dropdown>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3 text-center transition-all hover:scale-105">
              <div className="flex items-center justify-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-lg font-bold">{currentStreak}</span>
              </div>
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mt-1">
                Streak
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3 text-center transition-all hover:scale-105">
              <div className="flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                <span className="text-lg font-bold">{completionRate}%</span>
              </div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">
                Rate
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 p-3 text-center transition-all hover:scale-105">
              <div className="flex items-center justify-center space-x-1.5 text-purple-600 dark:text-purple-400">
                <Calendar className="h-4 w-4" />
                <span className="text-lg font-bold">{completions.length}</span>
              </div>
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mt-1">Total</p>
            </div>
          </div>

          {/* Progress Section */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>Today</span>
              <span>
                {todayCompletions.reduce((sum, completion) => sum + (completion.value || 0), 0)} /{' '}
                {habit.target} {habit.unit}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Completion Section */}
          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-200',
              isCompleted
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
              isAnimating ? 'scale-[0.98]' : ''
            )}
          >
            <button
              onClick={handleToggleComplete}
              disabled={isAnimating}
              data-testid={`habit-checkbox-${habit.name}`}
              className={cn(
                'flex items-center gap-3 text-sm font-medium transition-all duration-200',
                isCompleted
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-300'
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'h-5 w-5 rounded-md border-2 transition-all duration-200',
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
                      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                  )}
                >
                  {isCompleted && <Check className="absolute inset-0 m-auto h-3 w-3 text-white" />}
                </div>
              </div>
              <span>{isCompleted ? 'Completed today' : 'Mark complete'}</span>
            </button>

            <span
              className={cn(
                'text-sm font-medium',
                isCompleted
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {isCompleted
                ? 'Nice work, keep the streak alive! 🔥'
                : `Target ${habit.target} ${habit.unit || 'unit'}`}
            </span>
          </div>

          {habit.tags && habit.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {habit.tags.slice(0, 3).map((tag) => (
                <Badge key={`${habit.id}-${tag}`} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
              {habit.tags.length > 3 && (
                <Badge variant="secondary" size="sm">
                  +{habit.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { HabitCard };
