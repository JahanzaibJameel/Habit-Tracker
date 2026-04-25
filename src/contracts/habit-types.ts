// TypeScript type definitions for habit tracker

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recurrencePattern?: RecurrencePattern;
  dependencies?: string[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  position: number;
  isPublic: boolean;
  tags: string[];
}

export interface CreateHabit {
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recurrencePattern?: RecurrencePattern;
  dependencies?: string[];
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateHabit {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  target?: number;
  unit?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  recurrencePattern?: RecurrencePattern;
  dependencies?: string[];
  isPublic?: boolean;
  tags?: string[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  value: number;
  completedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateHabitCompletion {
  habitId: string;
  value: number;
  completedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateHabitCompletion {
  value?: number;
  completedAt?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: {
    type: 'streak' | 'completions' | 'consistency' | 'special';
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  };
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    enabled: boolean;
    reminders: Array<{
      habitId: string;
      time: string;
      days: number[];
      enabled: boolean;
    }>;
    quietHours: {
      start: string;
      end: string;
    };
  };
  privacy: {
    shareAnalytics: boolean;
    publicProfile: boolean;
    dataRetention: number;
  };
  ui: {
    compactMode: boolean;
    showAnimations: boolean;
    defaultView: 'grid' | 'list';
    heatmapEnabled: boolean;
  };
}

export interface ShareableCard {
  id: string;
  habitId: string;
  title: string;
  description?: string;
  stats: {
    streak: number;
    completions: number;
    rate: number;
  };
  theme: 'light' | 'dark';
  customMessage?: string;
  expiresAt?: Date;
}

export interface Analytics {
  totalCompletions: number;
  completionRate: number;
  averageDaily: number;
  bestDay: string;
  worstDay: string;
  monthlyProgress: Array<{
    month: string;
    completions: number;
    target: number;
    rate: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    habits: number;
    completions: number;
    rate: number;
  }>;
}

export interface ExportData {
  habits: Habit[];
  completions: HabitCompletion[];
  analytics: Analytics;
  badges: Badge[];
  exportedAt: Date;
  version: string;
}
