import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={cn('relative', className)}
    >
      <Card hover className="h-full">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center space-x-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white"
                style={{ backgroundColor: habit.color || '#3b82f6' }}
              >
                {habit.icon || '🎯'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">
                  {habit.name || 'Untitled Habit'}
                </h3>
                <p className="text-sm capitalize text-muted-foreground">{habit.category}</p>
                {habit.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {habit.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${habit.name}`}
                data-testid={`edit-habit-${habit.name}`}
                onClick={() => onEdit(habit)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${habit.name}`}
                data-testid={`delete-habit-${habit.name}`}
                onClick={() => onDelete(habit.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Dropdown
                isOpen={showActions}
                onOpenChange={setShowActions}
                placement="bottom-right"
                trigger={
                  <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2"
                  onClick={() => {
                    onShare(habit);
                    setShowActions(false);
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-3 py-2 text-orange-600 hover:text-orange-700"
                  onClick={() => {
                    onArchive(habit.id);
                    setShowActions(false);
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </Dropdown>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center space-x-1 text-blue-600">
                <TrendingUp className="h-3 w-3" />
                <span className="text-sm font-semibold">{currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center space-x-1 text-green-600">
                <Check className="h-3 w-3" />
                <span className="text-sm font-semibold">{completionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Rate</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center space-x-1 text-purple-600">
                <Calendar className="h-3 w-3" />
                <span className="text-sm font-semibold">{completions.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Today</span>
              <span>
                {todayCompletions.reduce((sum, completion) => sum + (completion.value || 0), 0)} /{' '}
                {habit.target} {habit.unit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <motion.div
                className="h-2 rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((todayCompletions.reduce((sum, completion) => sum + (completion.value || 0), 0) / (habit.target || 1)) * 100, 100)}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between',
              isCompleted && 'border-green-300 bg-green-50',
              isAnimating && 'scale-[0.99]'
            )}
          >
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={isCompleted}
                disabled={isAnimating}
                onChange={handleToggleComplete}
                data-testid={`habit-checkbox-${habit.name}`}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>{isCompleted ? 'Completed today' : 'Mark complete'}</span>
            </label>

            <span
              className={cn(
                'text-sm font-medium',
                isCompleted ? 'text-green-700' : 'text-muted-foreground'
              )}
            >
              {isCompleted
                ? 'Nice work, keep the streak alive.'
                : `Target ${habit.target} ${habit.unit}`}
            </span>
          </div>

          {habit.tags && habit.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {habit.tags.slice(0, 3).map((tag) => (
                <span
                  key={`${habit.id}-${tag}`}
                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {habit.tags.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  +{habit.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export { HabitCard };
