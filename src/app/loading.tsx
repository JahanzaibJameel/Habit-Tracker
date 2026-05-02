'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-slate-600 dark:text-slate-400">Loading Habit Tracker...</p>
      </div>
    </div>
  );
}
