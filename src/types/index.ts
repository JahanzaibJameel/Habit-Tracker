// Core types for the habit tracker
export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  goal: number; // Target per week
  schedule: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
  category?: string;
  tags: string[];
}

export interface Completion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number; // For quantitative habits
  notes?: string;
  timestamp: Date;
}

export interface Analytics {
  totalHabits: number;
  activeHabits: number;
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyGoalProgress: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  weeklyStartDay: 'monday' | 'sunday';
  notifications: {
    enabled: boolean;
    morningTime: string; // "08:00"
    eveningTime: string; // "20:00"
  };
  defaultView: 'daily' | 'weekly' | 'monthly';
  showMotivationalQuotes: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

export interface StreakData {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompleted: string | null;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';
export type SortBy = 'name' | 'created' | 'streak' | 'priority';
export type FilterBy = 'all' | 'active' | 'completed' | 'archived';
