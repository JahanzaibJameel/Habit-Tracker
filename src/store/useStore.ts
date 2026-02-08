'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { 
  Habit, 
  Completion, 
  Analytics, 
  UserPreferences 
} from '@/lib/types'

// Initial states
const initialHabits: Habit[] = []
const initialCompletions: Completion[] = []

const initialPreferences: UserPreferences = {
  theme: 'system',
  weeklyStartDay: 'monday',
  notifications: {
    enabled: false,
    morningTime: '08:00',
    eveningTime: '20:00'
  },
  defaultView: 'daily',
  showMotivationalQuotes: true,
  vibrationEnabled: true,
  soundEnabled: true
}

const calculateAnalytics = (habits: Habit[], completions: Completion[]): Analytics => {
  const activeHabits = habits.filter(h => !h.archived).length
  const totalCompletions = completions.filter(c => c.completed).length
  const today = new Date().toISOString().split('T')[0]
  const todayCompletions = completions.filter(c => c.date === today && c.completed).length
  
  return {
    totalHabits: habits.length,
    activeHabits,
    totalCompletions,
    currentStreak: 0,
    longestStreak: 0,
    completionRate: activeHabits > 0 ? (todayCompletions / activeHabits) * 100 : 0,
    weeklyGoalProgress: 0
  }
}

// Create the store
export const useStore = create(
  persist(
    (set, get) => ({
      // State
      habits: initialHabits,
      completions: initialCompletions,
      preferences: initialPreferences,
      selectedDate: new Date().toISOString().split('T')[0],
      viewMode: 'daily' as const,
      isLoading: false,
      
      // Analytics (computed)
      analytics: calculateAnalytics(initialHabits, initialCompletions),
      streaks: new Map(),
      
      // Actions
      addHabit: (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => {
        const newHabit: Habit = {
          ...habitData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          archived: false,
          tags: habitData.tags || []
        }
        set((state) => {
          const newHabits = [...state.habits, newHabit]
          return {
            habits: newHabits,
            analytics: calculateAnalytics(newHabits, state.completions)
          }
        })
      },
      
      updateHabit: (id: string, updates: Partial<Habit>) => {
        set((state) => {
          const newHabits = state.habits.map(habit => 
            habit.id === id 
              ? { ...habit, ...updates, updatedAt: new Date() }
              : habit
          )
          return {
            habits: newHabits,
            analytics: calculateAnalytics(newHabits, state.completions)
          }
        })
      },
      
      deleteHabit: (id: string) => {
        set((state) => {
          const newHabits = state.habits.filter(h => h.id !== id)
          const newCompletions = state.completions.filter(c => c.habitId !== id)
          return {
            habits: newHabits,
            completions: newCompletions,
            analytics: calculateAnalytics(newHabits, newCompletions)
          }
        })
      },
      
      toggleHabitArchived: (id: string) => {
        set((state) => {
          const newHabits = state.habits.map(habit => 
            habit.id === id 
              ? { ...habit, archived: !habit.archived, updatedAt: new Date() }
              : habit
          )
          return {
            habits: newHabits,
            analytics: calculateAnalytics(newHabits, state.completions)
          }
        })
      },
      
      toggleCompletion: (habitId: string, date?: string) => {
        const targetDate = date || get().selectedDate
        set((state) => {
          const existingIndex = state.completions.findIndex(
            c => c.habitId === habitId && c.date === targetDate
          )
          
          let newCompletions: Completion[]
          
          if (existingIndex !== -1) {
            // Toggle existing completion
            newCompletions = state.completions.map((c, idx) => 
              idx === existingIndex 
                ? { ...c, completed: !c.completed, timestamp: new Date() }
                : c
            )
          } else {
            // Add new completion
            newCompletions = [...state.completions, {
              id: crypto.randomUUID(),
              habitId,
              date: targetDate,
              completed: true,
              timestamp: new Date()
            }]
          }
          
          return {
            completions: newCompletions,
            analytics: calculateAnalytics(state.habits, newCompletions)
          }
        })
      },
      
      setTheme: (theme: UserPreferences['theme']) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            theme
          }
        }))
      },
      
      setWeeklyStartDay: (day: UserPreferences['weeklyStartDay']) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            weeklyStartDay: day
          }
        }))
      },
      
      toggleNotifications: () => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            notifications: {
              ...state.preferences.notifications,
              enabled: !state.preferences.notifications.enabled
            }
          }
        }))
      },
      
      updatePreferences: (updates: Partial<UserPreferences>) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...updates
          }
        }))
      },
      
      setSelectedDate: (date: string) => {
        set({ selectedDate: date })
      },
      
      setViewMode: (mode: 'daily' | 'weekly' | 'monthly') => {
        set({ viewMode: mode })
      },
      
      resetStore: () => {
        set({
          habits: initialHabits,
          completions: initialCompletions,
          preferences: initialPreferences,
          selectedDate: new Date().toISOString().split('T')[0],
          viewMode: 'daily',
          isLoading: false,
          analytics: calculateAnalytics([], []),
          streaks: new Map()
        })
      },
      
      importData: (data: { habits: Habit[]; completions: Completion[] }) => {
        set({
          habits: data.habits,
          completions: data.completions,
          analytics: calculateAnalytics(data.habits, data.completions)
        })
      }
    }),
    {
      name: 'habit-tracker-storage',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : undefined
      ),
      partialize: (state) => ({
        habits: state.habits,
        completions: state.completions,
        preferences: state.preferences
      })
    }
  )
)

// Custom hooks for derived state
export const useActiveHabits = () => {
  return useStore((state) => state.habits.filter(habit => !habit.archived))
}

export const useTodayCompletions = () => {
  const today = new Date().toISOString().split('T')[0]
  return useStore((state) => 
    state.completions.filter(c => c.date === today)
  )
}

export const useAnalytics = () => {
  return useStore((state) => state.analytics)
}

// Hook for actions only
export const useStoreActions = () => {
  return useStore((state) => ({
    addHabit: state.addHabit,
    toggleCompletion: state.toggleCompletion,
    resetStore: state.resetStore,
    setTheme: state.setTheme
  }))
}