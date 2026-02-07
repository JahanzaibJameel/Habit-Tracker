import { z } from 'zod';

// Habit schema
export const habitSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  icon: z.string().min(1, "Icon is required"),
  goal: z.number().min(1, "Goal must be at least 1").max(7, "Goal cannot exceed 7"),
  schedule: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),
  category: z.string().max(30, "Category too long").optional(),
  tags: z.array(z.string().max(20)).max(5, "Maximum 5 tags allowed").optional(),
});

// Completion schema
export const completionSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
  value: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Preferences schema
export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  weeklyStartDay: z.enum(['monday', 'sunday']),
  notifications: z.object({
    enabled: z.boolean(),
    morningTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    eveningTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  defaultView: z.enum(['daily', 'weekly', 'monthly']),
  showMotivationalQuotes: z.boolean(),
  vibrationEnabled: z.boolean(),
  soundEnabled: z.boolean(),
});

// Type inference
export type HabitInput = z.infer<typeof habitSchema>;
export type CompletionInput = z.infer<typeof completionSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;