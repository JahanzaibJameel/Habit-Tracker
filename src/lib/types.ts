// Core types for the habit tracker
export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  goal: number;
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
  date: string;
  completed: boolean;
  value?: number;
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
    morningTime: string;
    eveningTime: string;
  };
  defaultView: 'daily' | 'weekly' | 'monthly';
  showMotivationalQuotes: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';
export type SortBy = 'name' | 'created' | 'streak' | 'priority';
export type FilterBy = 'all' | 'active' | 'completed' | 'archived';