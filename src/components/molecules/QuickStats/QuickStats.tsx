'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Database, RefreshCw, HardDrive, Activity } from 'lucide-react'
import { Button } from '@/components/atoms/Button/Button'

export function QueryStats() {
  const queryClient = useQueryClient()
  
  const handleRefreshAll = () => {
    queryClient.invalidateQueries()
  }
  
  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      queryClient.clear()
      queryClient.invalidateQueries()
    }
  }
  
  const cache = queryClient.getQueryCache()
  const queries = cache.findAll()
  
  const stats = {
    totalQueries: queries.length,
    activeQueries: queries.filter(q => q.state.status === 'pending').length,
    staleQueries: queries.filter(q => q.isStale()).length,
    freshQueries: queries.filter(q => !q.isStale()).length,
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">React Query Cache</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time data management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshAll}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearCache}
            className="text-red-600 dark:text-red-400"
          >
            <HardDrive className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold">{stats.totalQueries}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Total Queries</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="w-5 h-5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-2xl font-bold">{stats.activeQueries}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="w-5 h-5 rounded-full bg-green-500" />
            <span className="text-2xl font-bold">{stats.freshQueries}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Fresh</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="w-5 h-5 rounded-full bg-gray-400" />
            <span className="text-2xl font-bold">{stats.staleQueries}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Stale</p>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-semibold mb-3">Recent Queries</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {queries.slice(0, 5).map((query) => (
            <div
              key={query.queryHash}
              className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded"
            >
              <span className="font-mono text-xs truncate">
                {JSON.stringify(query.queryKey[0])}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                query.state.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : query.isStale()
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {query.state.status === 'pending' ? 'Loading' : query.isStale() ? 'Stale' : 'Fresh'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}