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

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
}

export interface DependencyRule {
  id: string;
  type: 'completion' | 'streak' | 'time' | 'custom';
  sourceHabitId: string;
  targetHabitId: string;
  condition:
    | 'must_complete'
    | 'must_not_complete'
    | 'streak_greater'
    | 'streak_equal'
    | 'time_before'
    | 'time_after';
  value?: number;
  timeValue?: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BadgeRequirement {
  type: 'streak_days' | 'total_completions' | 'habit_streak' | 'special';
  value?: number;
  habitId?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'streak' | 'completion' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  color: string;
  requirement: BadgeRequirement;
  unlockedAt?: Date;
  createdAt: Date;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  value: number;
  completedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface Streak {
  current: number;
  longest: number;
  startDate?: Date;
  endDate?: Date;
}

export interface Analytics {
  totalCompletions: number;
  completionRate: number;
  averageDaily: number;
  bestDay: string;
  worstDay: string;
  monthlyProgress: MonthlyProgress[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface MonthlyProgress {
  month: string;
  completions: number;
  target: number;
  rate: number;
}

export interface CategoryBreakdown {
  category: string;
  habits: number;
  completions: number;
  rate: number;
}

export interface BadgeCondition {
  type: 'streak' | 'completions' | 'consistency' | 'special';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  ui: UISettings;
}

export interface NotificationSettings {
  enabled: boolean;
  reminders: ReminderSettings[];
  quietHours: {
    start: string;
    end: string;
  };
}

export interface ReminderSettings {
  habitId: string;
  time: string;
  days: number[];
  enabled: boolean;
}

export interface PrivacySettings {
  shareAnalytics: boolean;
  publicProfile: boolean;
  dataRetention: number;
}

export interface UISettings {
  compactMode: boolean;
  showAnimations: boolean;
  defaultView: 'grid' | 'list';
  heatmapEnabled: boolean;
}

export interface ExportData {
  habits: Habit[];
  completions: HabitCompletion[];
  analytics: Analytics;
  badges: Badge[];
  exportedAt: Date;
  version: string;
}

export interface ShareableCard {
  id: string;
  habitId: string;
  title: string;
  description: string;
  stats: {
    streak: number;
    completions: number;
    rate: number;
  };
  theme: 'light' | 'dark';
  customMessage?: string;
  expiresAt?: Date;
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSync: Date | null;
}

export type SortOrder = 'name' | 'created' | 'updated' | 'position' | 'streak';
export type FilterStatus = 'all' | 'active' | 'archived' | 'completed';
export type ViewMode = 'grid' | 'list' | 'calendar';
