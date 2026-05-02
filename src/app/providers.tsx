'use client';

import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { useHabitStore } from '../store/habit-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { preferences } = useHabitStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
