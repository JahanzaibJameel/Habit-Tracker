'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

import { useHydration } from '../hooks/useHydration';
import { persistOptions } from '../lib/query-client';

function ReactQueryDevtoolsClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <ReactQueryDevtools initialIsOpen={false} />;
}

let queryClient: QueryClient;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });
}

function getQueryClient() {
  if (!queryClient) {
    queryClient = makeQueryClient();
    // Only persist on client side
    if (typeof window !== 'undefined' && persistOptions) {
      persistQueryClient(persistOptions);
    }
  }
  return queryClient;
}

function HydrationSafeThemeProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useHydration();

  if (!isHydrated) {
    // Return children without ThemeProvider during SSR to prevent hydration mismatch
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationSafeThemeProvider>
        {children}
        <ReactQueryDevtoolsClient />
      </HydrationSafeThemeProvider>
    </QueryClientProvider>
  );
}
