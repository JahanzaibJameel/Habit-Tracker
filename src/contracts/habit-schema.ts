import { z } from 'zod';

export const recurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  interval: z.number().min(1).max(365),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  endDate: z.date().optional(),
});

export const habitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  category: z.string().min(1).max(50),
  target: z.number().min(1).max(10000),
  unit: z.string().min(1).max(20),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recurrencePattern: recurrencePatternSchema.optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().optional(),
  position: z.number().min(0),
  isPublic: z.boolean(),
  tags: z.array(z.string().min(1).max(30)).max(10),
});

export const createHabitSchema = habitSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    archivedAt: true,
    position: true,
  })
  .partial({
    description: true,
    recurrencePattern: true,
    dependencies: true,
    isPublic: true,
    tags: true,
  });

export const updateHabitSchema = createHabitSchema.partial();

export const habitCompletionSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  value: z.number().min(0),
  completedAt: z.date(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createHabitCompletionSchema = habitCompletionSchema.omit({
  id: true,
});

export const updateHabitCompletionSchema = createHabitCompletionSchema.partial();

export const badgeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(50),
  condition: z.object({
    type: z.enum(['streak', 'completions', 'consistency', 'special']),
    value: z.number().min(1),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'all-time']).optional(),
  }),
  unlockedAt: z.date().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().min(2).max(10),
  timezone: z.string().min(1),
  notifications: z.object({
    enabled: z.boolean(),
    reminders: z.array(
      z.object({
        habitId: z.string().uuid(),
        time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        days: z.array(z.number().min(0).max(6)),
        enabled: z.boolean(),
      })
    ),
    quietHours: z.object({
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
  }),
  privacy: z.object({
    shareAnalytics: z.boolean(),
    publicProfile: z.boolean(),
    dataRetention: z.number().min(30).max(3650),
  }),
  ui: z.object({
    compactMode: z.boolean(),
    showAnimations: z.boolean(),
    defaultView: z.enum(['grid', 'list']),
    heatmapEnabled: z.boolean(),
  }),
});

export const shareableCardSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  stats: z.object({
    streak: z.number().min(0),
    completions: z.number().min(0),
    rate: z.number().min(0).max(100),
  }),
  theme: z.enum(['light', 'dark']),
  customMessage: z.string().max(200).optional(),
  expiresAt: z.date().optional(),
});

export const analyticsSchema = z.object({
  totalCompletions: z.number().min(0),
  completionRate: z.number().min(0).max(1),
  averageDaily: z.number().min(0),
  bestDay: z.string(),
  worstDay: z.string(),
  monthlyProgress: z.array(
    z.object({
      month: z.string(),
      completions: z.number().min(0),
      target: z.number().min(0),
      rate: z.number().min(0).max(1),
    })
  ),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      habits: z.number().min(0),
      completions: z.number().min(0),
      rate: z.number().min(0).max(1),
    })
  ),
});

export const exportDataSchema = z.object({
  habits: z.array(habitSchema),
  completions: z.array(habitCompletionSchema),
  analytics: analyticsSchema,
  badges: z.array(badgeSchema),
  exportedAt: z.date(),
  version: z.string(),
});

// Type exports
export type Habit = z.infer<typeof habitSchema>;
export type CreateHabit = z.infer<typeof createHabitSchema>;
export type UpdateHabit = z.infer<typeof updateHabitSchema>;
export type HabitCompletion = z.infer<typeof habitCompletionSchema>;
export type CreateHabitCompletion = z.infer<typeof createHabitCompletionSchema>;
export type UpdateHabitCompletion = z.infer<typeof updateHabitCompletionSchema>;
export type Badge = z.infer<typeof badgeSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type ShareableCard = z.infer<typeof shareableCardSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type ExportData = z.infer<typeof exportDataSchema>;
export type RecurrencePattern = z.infer<typeof recurrencePatternSchema>;
