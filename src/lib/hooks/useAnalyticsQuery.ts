import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { db } from '@/db'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay } from 'date-fns'
import type { Analytics } from '@/types'

// Calculate analytics from stored data
export const calculateAnalytics = async (): Promise<Analytics> => {
  const [habits, completions] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
  ])
  
  const activeHabits = habits.filter(h => !h.archived)
  const completedCompletions = completions.filter(c => c.completed)
  
  // Calculate streaks
  let currentStreak = 0
  let longestStreak = 0
  
  if (completedCompletions.length > 0) {
    const sortedDates = Array.from(
      new Set(completedCompletions.map(c => c.date))
    ).sort()
    
    let tempStreak = 1
    longestStreak = 1
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currDate = new Date(sortedDates[i])
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (diffDays === 1) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }
    
    // Check current streak
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
    
    if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
      currentStreak = tempStreak
    }
  }
  
  // Calculate weekly progress
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekCompletions = completedCompletions.filter(c => {
    const date = new Date(c.date)
    return date >= weekStart && date <= weekEnd
  })
  
  const totalWeeklyGoal = activeHabits.reduce((sum, habit) => {
    const daysInSchedule = Object.values(habit.schedule).filter(Boolean).length
    return sum + daysInSchedule
  }, 0)
  
  const weeklyGoalProgress = totalWeeklyGoal > 0 
    ? (weekCompletions.length / totalWeeklyGoal) * 100 
    : 0
  
  // Calculate completion rate
  const totalPossibleCompletions = activeHabits.length * 7 // Last 7 days
  const recentCompletions = completedCompletions.filter(c => {
    const date = new Date(c.date)
    const weekAgo = new Date(Date.now() - 7 * 86400000)
    return date >= weekAgo
  })
  
  const completionRate = totalPossibleCompletions > 0
    ? (recentCompletions.length / totalPossibleCompletions) * 100
    : 0
  
  return {
    totalHabits: habits.length,
    activeHabits: activeHabits.length,
    totalCompletions: completedCompletions.length,
    currentStreak,
    longestStreak,
    completionRate,
    weeklyGoalProgress,
  }
}

// React Query hook for analytics
export const useAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: calculateAnalytics,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook for weekly progress
export const useWeeklyProgress = (weekStart: string) => {
  return useQuery({
    queryKey: queryKeys.weeklyProgress(weekStart),
    queryFn: async () => {
      const completions = await db.completions
        .where('date')
        .between(weekStart, format(new Date(weekStart), 'yyyy-MM-dd'))
        .toArray()
      
      const habits = await db.habits.toArray()
      
      // Calculate progress for each day
      const days = eachDayOfInterval({
        start: new Date(weekStart),
        end: new Date(format(new Date(weekStart), 'yyyy-MM-dd')),
      })
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayCompletions = completions.filter(c => c.date === dayStr && c.completed)
        const activeHabits = habits.filter(h => !h.archived && h.schedule[format(day, 'EEEE').toLowerCase() as keyof typeof h.schedule])
        
        return {
          date: dayStr,
          completed: dayCompletions.length,
          total: activeHabits.length,
          progress: activeHabits.length > 0 ? (dayCompletions.length / activeHabits.length) * 100 : 0,
        }
      })
    },
  })
}