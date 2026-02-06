'use client'

import { ThemeToggle } from '@/components/atoms/ThemeToggle/ThemeToggle'
import { Button } from '@/components/atoms/Button/Button'
import { CheckCircle, Plus, Target } from 'lucide-react'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Build Your Perfect Streak</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Day 1: Foundation complete. Ready to build powerful habits.
          </p>
          <ThemeToggle />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <Target className="w-10 h-10 text-primary-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Atomic Design</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Component architecture following atomic design principles for scalability.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Type Safe</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Full TypeScript support with strict type checking for robust development.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg mb-4" />
            <h3 className="text-xl font-semibold mb-2">Dark Mode</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seamless dark/light mode with system preference detection.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Ready for Day 2</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Habit
            </Button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Tomorrow: Setting up Zustand store for global state management.
          </p>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Day 1 Complete • Foundation Built</span>
          </div>
        </div>
      </div>
    </main>
  )
}