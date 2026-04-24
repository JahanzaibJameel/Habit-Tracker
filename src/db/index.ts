import Dexie, { type EntityTable } from 'dexie';
import type { Habit, Completion, UserPreferences } from '@/types';

// Extend Dexie interface
export interface HabitTrackerDB {
  habits: EntityTable<
    Habit,
    'id' // Primary key
  >;
  completions: EntityTable<
    Completion,
    'id', // Primary key
    'date' // Index
  >;
  preferences: EntityTable<
    UserPreferences,
    'id' // Primary key
  >;
}

// Create the database class
class HabitTrackerDatabase extends Dexie implements HabitTrackerDB {
  habits!: EntityTable<
    Habit,
    'id'
  >;
  completions!: EntityTable<
    Completion,
    'id',
    'date'
  >;
  preferences!: EntityTable<
    UserPreferences,
    'id'
  >;

  constructor() {
    super('HabitTrackerDB');
    
    // Database schema version 1
    this.version(1).stores({
      habits: 'id, name, archived, createdAt, category',
      completions: 'id, habitId, date, [habitId+date], completed',
      preferences: 'id',
    });

    // Add indexes for faster queries
    this.version(2).stores({
      habits: 'id, name, archived, createdAt, category, *tags',
      completions: 'id, habitId, date, [habitId+date], completed, timestamp',
      preferences: 'id',
    }).upgrade((tx) => {
      // Migration logic for version 2
      return tx.table('habits').toCollection().modify((habit) => {
        // Ensure tags exist as array
        if (!habit.tags || !Array.isArray(habit.tags)) {
          habit.tags = [];
        }
      });
    });

    // Optimize for streak calculations
    this.version(3).stores({
      habits: 'id, name, archived, createdAt, category, *tags',
      completions: 'id, habitId, date, [habitId+date], completed, timestamp',
      preferences: 'id',
    });
  }
}

// Create singleton instance
export const db = new HabitTrackerDatabase();

// Database utilities
export const dbUtils = {
  // Clear all data (for testing)
  async clearAll() {
    await Promise.all([
      db.habits.clear(),
      db.completions.clear(),
      db.preferences.clear(),
    ]);
  },

  // Export all data as JSON
  async exportData() {
    const [habits, completions, preferences] = await Promise.all([
      db.habits.toArray(),
      db.completions.toArray(),
      db.preferences.toArray(),
    ]);
    
    return {
      habits,
      completions,
      preferences,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  },

  // Import data from JSON
  async importData(data: {
    habits: Habit[];
    completions: Completion[];
    preferences: UserPreferences[];
  }) {
    await db.transaction('rw', db.habits, db.completions, db.preferences, async () => {
      await db.habits.clear();
      await db.completions.clear();
      await db.preferences.clear();
      
      await db.habits.bulkAdd(data.habits);
      await db.completions.bulkAdd(data.completions);
      await db.preferences.bulkAdd(data.preferences);
    });
  },

  // Get database statistics
  async getStats() {
    const [habitCount, completionCount, preferenceCount] = await Promise.all([
      db.habits.count(),
      db.completions.count(),
      db.preferences.count(),
    ]);

    const storageEstimate = await navigator.storage?.estimate?.();
    
    return {
      habitCount,
      completionCount,
      preferenceCount,
      totalRecords: habitCount + completionCount + preferenceCount,
      storageUsed: storageEstimate?.usage,
      storageQuota: storageEstimate?.quota,
      lastUpdated: new Date().toISOString(),
    };
  },
};