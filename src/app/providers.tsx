'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

import { useHabitStore } from '@/store/habit-store';

/**
 * Hydrates the persisted store after mount.
 *
 * The store is created with `skipHydration` (see habit-store.ts) so the client's
 * first render matches the server HTML.
 */
function useStoreHydration() {
  useEffect(() => {
    void useHabitStore.persist.rehydrate();
  }, []);
}

/**
 * True once the component has mounted on the client.
 *
 * Used to keep the first client render identical to the server render (both show
 * the skeleton), which is what prevents React's
 * "Hydration failed ... server rendered text didn't match" error for
 * localStorage-backed state.
 */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function HydrationSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading Habit Tracker…</p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useStoreHydration();
  const mounted = useMounted();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {mounted ? children : <HydrationSkeleton />}
    </ThemeProvider>
  );
}
