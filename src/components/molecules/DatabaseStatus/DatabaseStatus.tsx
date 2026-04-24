'use client'

import { Database, CheckCircle, AlertCircle, RefreshCw, Download, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button/Button'
import { useDatabaseStats } from '@/db/hooks'
import { useDataImportExport } from '@/db/hooks'
import { useState } from 'react'

export function DatabaseStatus() {
  const stats = useDatabaseStats()
  const { exportData, importData, clearAllData } = useDataImportExport()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await importData(data)
        alert('Data imported successfully! Please refresh the page.')
      } catch (error) {
        console.error('Import failed:', error)
        alert('Failed to import data. Please check the file format.')
      } finally {
        setIsImporting(false)
      }
    }
    
    input.click()
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Database Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stats ? 'Connected to IndexedDB' : 'Connecting...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImport}
            disabled={isImporting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Habits</span>
                <span className="font-semibold">{stats.habitCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(stats.habitCount * 10, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completions</span>
                <span className="font-semibold">{stats.completionCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(stats.completionCount / 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Storage Used</span>
              <span className="font-semibold">
                {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageQuota)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-500 h-2 rounded-full" 
                style={{ 
                  width: stats.storageQuota 
                    ? `${Math.min((stats.storageUsed || 0) / stats.storageQuota * 100, 100)}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm pt-2">
            <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
            <span className="font-semibold">
              {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-yellow-500 mr-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading database stats...</p>
        </div>
      )}
    </div>
  )
}