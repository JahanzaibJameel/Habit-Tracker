'use client'

import { TrendingUp, Target, CheckCircle, Flame } from 'lucide-react'
import { useAnalytics } from '@/store/useStore'

export function QuickStats() {
  const analytics = useAnalytics()

  const stats = [
    {
      label: 'Active Habits',
      value: analytics.activeHabits.toString(),
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      label: 'Current Streak',
      value: `${analytics.currentStreak} days`,
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(analytics.completionRate)}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      label: 'Total Completions',
      value: analytics.totalCompletions.toString(),
      icon: CheckCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <span className="text-2xl font-bold">{stat.value}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}