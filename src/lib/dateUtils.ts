import type { HabitCompletion } from '../types';

/**
 * Safe date utilities that handle timezone issues properly
 */

// Get the start of day in user's timezone
export const getStartOfDay = (date: Date = new Date()): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Get the end of day in user's timezone
export const getEndOfDay = (date: Date = new Date()): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Check if two dates are the same day (timezone-safe)
export const isSameDay = (date1: Date, date2: Date): boolean => {
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  return d1.getTime() === d2.getTime();
};

// Get today's completions (timezone-safe)
export const getTodayCompletions = (completions: HabitCompletion[]): HabitCompletion[] => {
  const today = getStartOfDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return completions.filter((completion) => {
    const completionDate = new Date(completion.completedAt);
    return completionDate >= today && completionDate < tomorrow;
  });
};

// Calculate streak (timezone-safe and robust)
export const calculateStreak = (completions: HabitCompletion[]): number => {
  if (completions.length === 0) return 0;

  // Sort completions by date (newest first)
  const sortedCompletions = completions
    .map((c) => ({ ...c, date: getStartOfDay(new Date(c.completedAt)) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  let streak = 0;
  let currentDate = getStartOfDay();

  for (const completion of sortedCompletions) {
    if (completion.date.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (completion.date.getTime() < currentDate.getTime()) {
      // Check if it's the previous day (consecutive)
      const previousDay = new Date(currentDate);
      previousDay.setDate(previousDay.getDate() - 1);

      if (completion.date.getTime() === previousDay.getTime()) {
        streak++;
        currentDate = previousDay;
      } else {
        break; // Gap in streak
      }
    } else {
      break; // Future date, shouldn't happen
    }
  }

  return streak;
};

// Get completion rate (timezone-safe)
export const calculateCompletionRate = (
  completions: HabitCompletion[],
  habitCreatedAt: Date,
  frequency: 'daily' | 'weekly' | 'monthly'
): number => {
  const now = new Date();
  const startDate = getStartOfDay(habitCreatedAt);
  const today = getStartOfDay(now);

  // Calculate days since creation (including today)
  const daysSinceCreation =
    Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let expectedCompletions = daysSinceCreation;
  if (frequency === 'weekly') {
    expectedCompletions = Math.ceil(daysSinceCreation / 7);
  } else if (frequency === 'monthly') {
    expectedCompletions = Math.ceil(daysSinceCreation / 30);
  }

  if (expectedCompletions <= 0) return 0;

  // Count unique days with completions
  const uniqueDays = new Set(
    completions.map((c) => getStartOfDay(new Date(c.completedAt)).getTime())
  );

  return Math.round((uniqueDays.size / expectedCompletions) * 100);
};

// Format date for display (timezone-safe)
export const formatDate = (date: Date, format: 'short' | 'long' | 'time' = 'short'): string => {
  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    case 'time':
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });
    default:
      return d.toLocaleDateString('en-US', { timeZone: 'UTC' });
  }
};
