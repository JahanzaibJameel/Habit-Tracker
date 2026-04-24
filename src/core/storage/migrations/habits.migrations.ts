/**
 * Migration definitions for habit data
 * Handles version upgrades for habit tracking data
 * 
 * @fileoverview Habits migration definitions
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { Migration } from '../StorageEngine';
import { HabitSchema, HabitEntrySchema } from '../../validation/schemas';
import { z } from 'zod';

// Type definitions for different versions
type HabitV0 = {
  id: string;
  title: string;
  category?: string;
  frequency?: string;
  target?: number;
  createdAt?: string;
};

type HabitV1 = z.infer<typeof HabitSchema>;

type HabitEntryV0 = {
  id: string;
  habitId: string;
  value: number;
  date?: string;
};

type HabitEntryV1 = z.infer<typeof HabitEntrySchema>;

/**
 * Migration from v0 (basic habit) to v1 (structured with schema)
 */
export const habitMigrations: Migration<HabitV1>[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'Migrate from basic habit structure to v1 schema',
    estimatedTime: 100,
    migrate: (oldData: unknown, fromVersion: number, toVersion: number): HabitV1 => {
      const v0Data = oldData as HabitV0;
      
      return {
        _version: 1,
        _createdAt: v0Data.createdAt || new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: v0Data.id,
        userId: 'default', // Will need to be updated by the application
        title: v0Data.title,
        description: '',
        category: v0Data.category as any || 'other',
        frequency: {
          type: 'daily',
          value: 1,
          daysOfWeek: undefined,
        },
        target: {
          type: v0Data.target ? 'count' : 'boolean',
          value: v0Data.target || 1,
          unit: undefined,
        },
        streak: {
          current: 0,
          longest: 0,
          lastCompletedAt: undefined,
        },
        isActive: true,
      };
    },
  },
];

/**
 * Migration from v0 (basic entry) to v1 (structured with schema)
 */
export const habitEntryMigrations: Migration<HabitEntryV1>[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'Migrate from basic entry structure to v1 schema',
    estimatedTime: 75,
    migrate: (oldData: unknown, fromVersion: number, toVersion: number): HabitEntryV1 => {
      const v0Data = oldData as HabitEntryV0;
      
      return {
        _version: 1,
        id: v0Data.id,
        habitId: v0Data.habitId,
        userId: 'default', // Will need to be updated by the application
        value: v0Data.value,
        completedAt: v0Data.date || new Date().toISOString(),
        notes: undefined,
        metadata: undefined,
      };
    },
  },
];
