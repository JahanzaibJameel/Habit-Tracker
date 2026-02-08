'use client'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/atoms/ThemeToggle/ThemeToggle'
import { Button } from '@/components/atoms/Button/Button'
import { QuickStats } from '@/components/molecules/QuickStats/QuickStats'
import { Plus, Check, X, Target, Zap } from 'lucide-react'
import { useStore, useActiveHabits, useTodayCompletions, useStoreActions } from '@/store/useStore'

// Mock data for testing
const mockHabits = [
  {
    name: 'Morning Meditation',
    description: '10 minutes of mindfulness',
    color: '#3b82f6',
    icon: '🧘',
    goal: 7,
    schedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    tags: ['mindfulness', 'morning'],
  },
]

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { addHabit, toggleCompletion, resetStore } = useStoreActions()
  const habits = useActiveHabits()
  const todayCompletions = useTodayCompletions()
  const [showDebug, setShowDebug] = useState(false)
  
  // Wait for mount to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Habit Tracker...</p>
          </div>
        </div>
      </main>
    )
  }
  
  const handleAddMockHabit = () => {
    const habitData = mockHabits[0]
    addHabit(habitData)
  }
  
  const handleToggleCompletion = (habitId: string) => {
    toggleCompletion(habitId)
  }
  
  const isHabitCompletedToday = (habitId: string) => {
    return todayCompletions.some(c => c.habitId === habitId && c.completed)
  }
  
  const handleResetStore = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      resetStore()
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">10/10 Habit Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Working Store Implementation
            </p>
          </div>
          <ThemeToggle />
        </div>

        <QuickStats />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Habits Column */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Today's Habits</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDebug(!showDebug)}
                  >
                    {showDebug ? 'Hide Debug' : 'Show Debug'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetStore}
                    className="text-red-600 dark:text-red-400"
                  >
                    Reset Store
                  </Button>
                </div>
              </div>

              {habits.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No habits yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Add a habit to get started!
                  </p>
                  <Button
                    onClick={handleAddMockHabit}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sample Habit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {habits.map((habit) => {
                    const completed = isHabitCompletedToday(habit.id)
                    return (
                      <div
                        key={habit.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: `${habit.color}20` }}
                          >
                            <span style={{ color: habit.color }}>
                              {habit.icon}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{habit.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {habit.description}
                            </p>
                          </div>
                        </div>
                        
                        <Button
                          variant={completed ? "default" : "outline"}
                          onClick={() => handleToggleCompletion(habit.id)}
                          className={completed ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {completed ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Store Info Column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-bold">Store Status</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Habits:</span>
                  <span className="font-semibold">{habits.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Today's Completions:</span>
                  <span className="font-semibold">
                    {todayCompletions.filter(c => c.completed).length}/{habits.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Debug Panel */}
            {showDebug && (
              <div className="bg-gray-900 text-gray-100 rounded-2xl p-6">
                <h4 className="font-mono font-bold mb-4">Store Debug</h4>
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(useStore.getState(), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}