import type { Table } from 'dexie';
import Dexie from 'dexie';

import type { Analytics, Badge, Habit, HabitCompletion, UserPreferences } from '../types';

export class HabitDatabase extends Dexie {
  habits!: Table<Habit>;
  completions!: Table<HabitCompletion>;
  analytics!: Table<Analytics>;
  badges!: Table<Badge>;
  preferences!: Table<UserPreferences>;

  constructor() {
    super('HabitTrackerDatabase');

    this.version(1).stores({
      habits: '++id, name, category, createdAt, updatedAt, archivedAt, position',
      completions: '++id, habitId, completedAt, value',
      analytics: '++id, totalCompletions, completionRate, averageDaily',
      badges: '++id, name, rarity, unlockedAt',
      preferences: '++id, theme, language, timezone',
    });

    // Hooks for optimistic updates
    this.habits.hook('creating', (primKey, obj, trans) => {
      console.log('Creating habit:', obj);
    });

    this.habits.hook('updating', (modifications, primKey, obj, trans) => {
      console.log('Updating habit:', modifications);
    });

    this.habits.hook('deleting', (primKey, obj, trans) => {
      console.log('Deleting habit:', obj);
    });
  }

  // Habit operations
  async createHabit(habit: Omit<Habit, 'id'>): Promise<string> {
    const id = await this.habits.add(habit as Habit);
    return id.toString();
  }

  async getHabits(): Promise<Habit[]> {
    return await this.habits.orderBy('position').toArray();
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    return await this.habits.get(id);
  }

  async updateHabit(id: string, updates: Partial<Habit>): Promise<number> {
    return await this.habits.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteHabit(id: string): Promise<void> {
    await this.transaction('rw', this.habits, this.completions, async () => {
      await this.completions.where('habitId').equals(id).delete();
      await this.habits.delete(id);
    });
  }

  async archiveHabit(id: string): Promise<number> {
    return await this.habits.update(id, {
      archivedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async restoreHabit(id: string): Promise<number> {
    return await this.habits.update(id, {
      archivedAt: null as any,
      updatedAt: new Date(),
    });
  }

  async reorderHabits(habitIds: string[]): Promise<void> {
    await this.transaction('rw', this.habits, async () => {
      for (let i = 0; i < habitIds.length; i++) {
        await this.habits.update(habitIds[i], {
          position: i,
          updatedAt: new Date(),
        });
      }
    });
  }

  // Completion operations
  async createCompletion(completion: Omit<HabitCompletion, 'id'>): Promise<string> {
    const id = await this.completions.add(completion as HabitCompletion);
    return id.toString();
  }

  async getCompletions(): Promise<HabitCompletion[]> {
    return await this.completions.orderBy('completedAt').reverse().toArray();
  }

  async getCompletionsByHabit(habitId: string): Promise<HabitCompletion[]> {
    return await this.completions.where('habitId').equals(habitId).toArray();
  }

  async getCompletionsByDateRange(startDate: Date, endDate: Date): Promise<HabitCompletion[]> {
    return await this.completions.where('completedAt').between(startDate, endDate).toArray();
  }

  async getTodayCompletions(): Promise<HabitCompletion[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return await this.completions.where('completedAt').between(startOfDay, endOfDay).toArray();
  }

  async updateCompletion(id: string, updates: Partial<HabitCompletion>): Promise<number> {
    return await this.completions.update(id, updates);
  }

  async deleteCompletion(id: string): Promise<void> {
    await this.completions.delete(id);
  }

  async toggleCompletion(habitId: string, value: number = 1): Promise<HabitCompletion | null> {
    const today = new Date().toDateString();
    const existingCompletion = await this.completions
      .where('habitId')
      .equals(habitId)
      .and((completion) => new Date(completion.completedAt).toDateString() === today)
      .first();

    if (existingCompletion) {
      await this.completions.delete(existingCompletion.id);
      return null;
    } else {
      const newCompletion: Omit<HabitCompletion, 'id'> = {
        habitId,
        value,
        completedAt: new Date(),
      };
      const id = await this.completions.add(newCompletion as HabitCompletion);
      return (await this.completions.get(id)) || null;
    }
  }

  // Analytics operations
  async saveAnalytics(analytics: Analytics): Promise<string> {
    // Delete existing analytics and save new one
    await this.analytics.clear();
    const id = await this.analytics.add(analytics);
    return id.toString();
  }

  async getAnalytics(): Promise<Analytics | undefined> {
    return await this.analytics.limit(1).first();
  }

  async calculateAnalytics(): Promise<Analytics> {
    const habits = await this.getHabits();
    const completions = await this.getCompletions();
    const activeHabits = habits.filter((h) => !h.archivedAt);

    const totalCompletions = completions.length;
    const completionRate =
      activeHabits.length > 0
        ? totalCompletions / (activeHabits.length * 30) // Assuming 30 days
        : 0;

    const averageDaily = totalCompletions / 30;

    // Calculate best/worst days
    const dayStats = new Map<string, number>();
    completions.forEach((completion) => {
      const day = new Date(completion.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayStats.set(day, (dayStats.get(day) || 0) + 1);
    });

    const sortedDays = Array.from(dayStats.entries()).sort((a, b) => b[1] - a[1]);
    const bestDay = sortedDays[0]?.[0] || 'Monday';
    const worstDay = sortedDays[sortedDays.length - 1]?.[0] || 'Sunday';

    // Calculate category breakdown
    const categoryStats = new Map<string, { habits: number; completions: number }>();
    habits.forEach((habit) => {
      const category = habit.category;
      const current = categoryStats.get(category) || { habits: 0, completions: 0 };
      current.habits++;
      categoryStats.set(category, current);
    });

    completions.forEach((completion) => {
      const habit = habits.find((h) => h.id === completion.habitId);
      if (habit) {
        const category = habit.category;
        const current = categoryStats.get(category) || { habits: 0, completions: 0 };
        current.completions++;
        categoryStats.set(category, current);
      }
    });

    const categoryBreakdown = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      habits: stats.habits,
      completions: stats.completions,
      rate: stats.habits > 0 ? stats.completions / stats.habits : 0,
    }));

    return {
      totalCompletions,
      completionRate,
      averageDaily,
      bestDay,
      worstDay,
      monthlyProgress: [],
      categoryBreakdown,
    };
  }

  // Badge operations
  async saveBadge(badge: Badge): Promise<string> {
    const id = await this.badges.add(badge);
    return id.toString();
  }

  async getBadges(): Promise<Badge[]> {
    return await this.badges.toArray();
  }

  async getUnlockedBadges(): Promise<Badge[]> {
    return await this.badges.filter((badge) => badge.unlockedAt !== null).toArray();
  }

  async unlockBadge(badgeId: string): Promise<number> {
    return await this.badges.update(badgeId, { unlockedAt: new Date() });
  }

  // Preferences operations
  async savePreferences(preferences: UserPreferences): Promise<string> {
    await this.preferences.clear();
    const id = await this.preferences.add(preferences);
    return id.toString();
  }

  async getPreferences(): Promise<UserPreferences | undefined> {
    return await this.preferences.limit(1).first();
  }

  // Sync operations
  async exportData(): Promise<any> {
    const habits = await this.getHabits();
    const completions = await this.getCompletions();
    const analytics = await this.getAnalytics();
    const badges = await this.getBadges();

    return {
      habits,
      completions,
      analytics,
      badges,
      exportedAt: new Date(),
      version: '1.0.0',
    };
  }

  async importData(data: any): Promise<void> {
    await this.transaction(
      'rw',
      this.habits,
      this.completions,
      this.analytics,
      this.badges,
      async () => {
        await this.habits.clear();
        await this.completions.clear();
        await this.analytics.clear();
        await this.badges.clear();

        if (data.habits) await this.habits.bulkAdd(data.habits);
        if (data.completions) await this.completions.bulkAdd(data.completions);
        if (data.analytics) await this.analytics.add(data.analytics);
        if (data.badges) await this.badges.bulkAdd(data.badges);
      }
    );
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    await this.habits.clear();
    await this.completions.clear();
    await this.analytics.clear();
    await this.badges.clear();
    await this.preferences.clear();
  }

  async getDatabaseSize(): Promise<number> {
    const habits = await this.habits.count();
    const completions = await this.completions.count();
    const badges = await this.badges.count();

    return habits + completions + badges;
  }
}

export const db = new HabitDatabase();

// Export database instance for use throughout the app
export default db;
