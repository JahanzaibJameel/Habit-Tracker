import { Habit, Completion, Analytics, UserPreferences } from './index';

export interface StoreState {
  // State
  habits: Habit[];
  completions: Completion[];
  preferences: UserPreferences;
  selectedDate: string; // YYYY-MM-DD
  viewMode: 'daily' | 'weekly' | 'monthly';
  isLoading: boolean;
  
  // Analytics (computed)
  analytics: Analytics;
  streaks: Map<string, { current: number; longest: number }>;
  
  // Actions
  // Habit CRUD
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitArchived: (id: string) => void;
  
  // Completion actions
  toggleCompletion: (habitId: string, date?: string) => void;
  setCompletionValue: (habitId: string, date: string, value: number) => void;
  bulkToggleCompletions: (habitIds: string[], date: string, completed: boolean) => void;
  
  // Preferences
  setTheme: (theme: UserPreferences['theme']) => void;
  setWeeklyStartDay: (day: UserPreferences['weeklyStartDay']) => void;
  toggleNotifications: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  
  // View
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  
  // Analytics helpers
  calculateAnalytics: () => Analytics;
  calculateStreak: (habitId: string) => { current: number; longest: number };
  
  // Utilities
  resetStore: () => void;
  importData: (data: { habits: Habit[]; completions: Completion[] }) => void;
}