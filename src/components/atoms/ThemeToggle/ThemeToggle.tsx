'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useStoreActions } from '@/store/useStore'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, themes } = useTheme()
  const { setTheme: setStoreTheme } = useStoreActions()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    setStoreTheme(newTheme)
  }

  if (!mounted) {
    return (
      <div className="flex items-center space-x-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
        <button className="p-2 rounded">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => handleThemeChange('light')}
        className={`p-2 rounded transition-colors ${
          theme === 'light'
            ? 'bg-white text-yellow-500 shadow-sm'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        aria-label="Light theme"
      >
        <Sun className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => handleThemeChange('dark')}
        className={`p-2 rounded transition-colors ${
          theme === 'dark'
            ? 'bg-gray-900 text-blue-400 shadow-sm'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        aria-label="Dark theme"
      >
        <Moon className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => handleThemeChange('system')}
        className={`p-2 rounded transition-colors ${
          theme === 'system'
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
        aria-label="System theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  )
}