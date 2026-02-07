'use client'

import { useState } from 'react'
import { ThemeToggle } from '@/components/atoms/ThemeToggle/ThemeToggle'
import { Button } from '@/components/atoms/Button/Button'
import { QuickStats } from '@/components/molecules/QuickStats/QuickStats'
import { Plus, Check, X, Target, Zap } from 'lucide-react'
import { useStore, useActiveHabits, useTodayCompletions, useStoreActions } from '@/store/useStore'
import { habitSchema } from '@/lib/schemas'

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
  {
    name: 'Read 30 Pages',
    description: 'Daily reading habit',
    color: '#10b981',
    icon: '📚',
    goal: 5,
    schedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    },
    tags: ['learning', 'reading'],
  },
  {
    name: 'Evening Walk',
    description: '30 minute walk',
    color: '#8b5cf6',
    icon: '🚶',
    goal: 4,
    schedule: {
      monday: false,
      tuesday: true,
      wednesday: false,
      thursday: true,
      friday: false,
      saturday: true,
      sunday: true,
    },
    tags: ['health', 'exercise'],
  },
]

export default function Home() {
  const { addHabit, toggleCompletion, resetStore } = useStoreActions()
  const habits = useActiveHabits()
  const todayCompletions = useTodayCompletions()
  const [showDebug, setShowDebug] = useState(false)
  
  const handleAddMockHabit = (index: number) => {
    const habitData = mockHabits[index]
    try {
      habitSchema.parse(habitData)
      addHabit(habitData)
    } catch (error) {
      console.error('Invalid habit data:', error)
    }
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
              Day 2: Zustand Store Implementation
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
                    Add some habits to get started!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {mockHabits.map((_, index) => (
                      <Button
                        key={index}
                        onClick={() => handleAddMockHabit(index)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Sample {index + 1}
                      </Button>
                    ))}
                  </div>
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
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Store Version:</span>
                  <span className="font-semibold">1.0.0</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => habits.forEach(h => handleToggleCompletion(h.id))}
                    variant="outline"
                  >
                    Mark All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => todayCompletions.forEach(c => handleToggleCompletion(c.habitId))}
                    variant="outline"
                  >
                    Clear All
                  </Button>
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

        {/* Information Panel */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl">
          <h3 className="text-xl font-bold mb-4">Day 2: Store Implementation Complete</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">✅ What's Implemented:</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Fully typed Zustand store with Immer
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Habit CRUD operations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Completion tracking with streaks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  User preferences management
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Real-time analytics computation
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🚀 Next Up (Day 3):</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Dexie.js for IndexedDB persistence
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Offline-first architecture
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Optimistic updates
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}