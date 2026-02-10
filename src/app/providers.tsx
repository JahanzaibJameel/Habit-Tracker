'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister } from '@/lib/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Database, Wifi, WifiOff, RefreshCw } from 'lucide-react'

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-xl border border-red-200 dark:border-red-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Data Loading Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an issue loading your data. This might be due to a network issue or corrupted data.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400 font-mono break-words">
              {error.message}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetErrorBoundary}
              className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 border border-gray-300 dark:border-gray-600 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Network status component
function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  if (isOnline) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <WifiOff className="w-5 h-5" />
        <span className="font-medium">You're offline. Working in offline mode.</span>
      </div>
    </div>
  )
}

// Query client wrapper
function QueryClientWrapper({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  
  useEffect(() => {
    // Initialize query client with default data
    const init = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ['habits'],
          queryFn: () => Promise.resolve([]),
        })
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize query client:', error)
        setIsInitialized(true) // Still set to true to show UI
      }
    }
    
    init()
  }, [])
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing data cache...</p>
        </div>
      </div>
    )
  }
  
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Resume mutations after cache restore
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries()
        })
      }}
    >
      {children}
      <ReactQueryDevtools 
        initialIsOpen={false}
        position="bottom-right"
        toggleButtonProps={{
          style: {
            marginBottom: '4rem',
            transform: 'scale(0.9)',
          },
        }}
      />
    </PersistQueryClientProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app here
        queryClient.clear()
        window.location.reload()
      }}
    >
      <QueryClientWrapper>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <NetworkStatus />
        </ThemeProvider>
      </QueryClientWrapper>
    </ErrorBoundary>
  )
}