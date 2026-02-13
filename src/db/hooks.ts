import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useRef } from 'react';
import { db, dbUtils } from '.';
import type { Habit, Completion, UserPreferences } from '@/types';
import { habitSchema, completionSchema, preferencesSchema } from '@/lib/schemas';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Custom error class for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Hook for reading habits with live updates
export function useHabits() {
  return useLiveQuery(async () => {
    try {
      return await db.habits.toArray();
    } catch (error) {
      console.error('Error fetching habits:', error);
      throw new DatabaseError('Failed to fetch habits', 'FETCH_HABITS_ERROR', error);
    }
  }, []);
}

// Hook for reading completions with live updates
export function useCompletions(date?: string) {
  return useLiveQuery(async () => {
    try {
      if (date) {
        return await db.completions
          .where('date')
          .equals(date)
          .toArray();
      }
      return await db.completions.toArray();
    } catch (error) {
      console.error('Error fetching completions:', error);
      throw new DatabaseError('Failed to fetch completions', 'FETCH_COMPLETIONS_ERROR', error);
    }
  }, [date]);
}

// Hook for reading preferences with live updates
export function usePreferences() {
  return useLiveQuery(async () => {
    try {
      const preferences = await db.preferences.toArray();
      return preferences[0] || null;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw new DatabaseError('Failed to fetch preferences', 'FETCH_PREFERENCES_ERROR', error);
    }
  }, []);
}

// Optimistic update queue
const optimisticQueue = new Map<string, { 
  operation: 'add' | 'update' | 'delete'; 
  data: any; 
  resolve: (value: any) => void;
  reject: (error: any) => void;
}>();

// Hook for habit CRUD operations with optimistic updates
export function useHabitOperations() {
  const pendingOperations = useRef(new Set<string>());

  const addHabit = useCallback(async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => {
    // Validate input
    const validatedData = habitSchema.parse(habitData);
    
    const habit: Habit = {
      ...validatedData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
      tags: validatedData.tags || [],
    };

    const operationId = `add-habit-${habit.id}`;
    
    if (pendingOperations.current.has(operationId)) {
      throw new DatabaseError('Operation already in progress', 'OPERATION_IN_PROGRESS');
    }

    pendingOperations.current.add(operationId);

    return new Promise<Habit>((resolve, reject) => {
      // Store in optimistic queue
      optimisticQueue.set(operationId, {
        operation: 'add',
        data: habit,
        resolve,
        reject,
      });

      // Immediately resolve optimistically
      resolve(habit);

      // Perform actual database operation
      db.habits
        .add(habit)
        .then(() => {
          optimisticQueue.delete(operationId);
          pendingOperations.current.delete(operationId);
        })
        .catch((error) => {
          const queueItem = optimisticQueue.get(operationId);
          if (queueItem) {
            queueItem.reject(new DatabaseError('Failed to add habit', 'ADD_HABIT_ERROR', error));
            optimisticQueue.delete(operationId);
          }
          pendingOperations.current.delete(operationId);
          // Rollback would happen here in a production app
          console.error('Failed to persist habit:', error);
        });
    });
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const operationId = `update-habit-${id}`;
    
    if (pendingOperations.current.has(operationId)) {
      throw new DatabaseError('Operation already in progress', 'OPERATION_IN_PROGRESS');
    }

    pendingOperations.current.add(operationId);

    return new Promise<Habit>((resolve, reject) => {
      // Get current habit for optimistic update
      db.habits.get(id)
        .then((currentHabit) => {
          if (!currentHabit) {
            throw new DatabaseError('Habit not found', 'HABIT_NOT_FOUND');
          }

          const updatedHabit: Habit = {
            ...currentHabit,
            ...updates,
            updatedAt: new Date(),
          };

          // Store in optimistic queue
          optimisticQueue.set(operationId, {
            operation: 'update',
            data: updatedHabit,
            resolve,
            reject,
          });

          // Immediately resolve optimistically
          resolve(updatedHabit);

          // Perform actual update
          return db.habits.update(id, updatedHabit);
        })
        .then(() => {
          optimisticQueue.delete(operationId);
          pendingOperations.current.delete(operationId);
        })
        .catch((error) => {
          const queueItem = optimisticQueue.get(operationId);
          if (queueItem) {
            queueItem.reject(new DatabaseError('Failed to update habit', 'UPDATE_HABIT_ERROR', error));
            optimisticQueue.delete(operationId);
          }
          pendingOperations.current.delete(operationId);
          console.error('Failed to update habit:', error);
        });
    });
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    const operationId = `delete-habit-${id}`;
    
    if (pendingOperations.current.has(operationId)) {
      throw new DatabaseError('Operation already in progress', 'OPERATION_IN_PROGRESS');
    }

    pendingOperations.current.add(operationId);

    return new Promise<void>((resolve, reject) => {
      // Store in optimistic queue
      optimisticQueue.set(operationId, {
        operation: 'delete',
        data: { id },
        resolve,
        reject,
      });

      // Immediately resolve optimistically
      resolve();

      // Perform deletion transaction
      db.transaction('rw', db.habits, db.completions, async () => {
        // Delete habit
        await db.habits.delete(id);
        
        // Delete all associated completions
        await db.completions.where('habitId').equals(id).delete();
      })
      .then(() => {
        optimisticQueue.delete(operationId);
        pendingOperations.current.delete(operationId);
      })
      .catch((error) => {
        const queueItem = optimisticQueue.get(operationId);
        if (queueItem) {
          queueItem.reject(new DatabaseError('Failed to delete habit', 'DELETE_HABIT_ERROR', error));
          optimisticQueue.delete(operationId);
        }
        pendingOperations.current.delete(operationId);
        console.error('Failed to delete habit:', error);
      });
    });
  }, []);

  const bulkUpdateHabits = useCallback(async (updates: Array<{ id: string; updates: Partial<Habit> }>) => {
    const operationId = `bulk-update-habits-${Date.now()}`;
    
    if (pendingOperations.current.has(operationId)) {
      throw new DatabaseError('Operation already in progress', 'OPERATION_IN_PROGRESS');
    }

    pendingOperations.current.add(operationId);

    return new Promise<void>((resolve, reject) => {
      // Store in optimistic queue
      optimisticQueue.set(operationId, {
        operation: 'update',
        data: updates,
        resolve,
        reject,
      });

      // Immediately resolve optimistically
      resolve();

      // Perform bulk update
      db.transaction('rw', db.habits, async () => {
        for (const { id, updates: habitUpdates } of updates) {
          await db.habits.update(id, {
            ...habitUpdates,
            updatedAt: new Date(),
          });
        }
      })
      .then(() => {
        optimisticQueue.delete(operationId);
        pendingOperations.current.delete(operationId);
      })
      .catch((error) => {
        const queueItem = optimisticQueue.get(operationId);
        if (queueItem) {
          queueItem.reject(new DatabaseError('Failed to bulk update habits', 'BULK_UPDATE_ERROR', error));
          optimisticQueue.delete(operationId);
        }
        pendingOperations.current.delete(operationId);
        console.error('Failed to bulk update habits:', error);
      });
    });
  }, []);

  return {
    addHabit,
    updateHabit,
    deleteHabit,
    bulkUpdateHabits,
  };
}

// Hook for completion operations
export function useCompletionOperations() {
  const toggleCompletion = useCallback(async (habitId: string, date: string = dayjs().format('YYYY-MM-DD')) => {
    try {
      // Check if completion exists
      const existingCompletion = await db.completions
        .where('[habitId+date]')
        .equals([habitId, date])
        .first();

      if (existingCompletion) {
        // Toggle existing completion
        await db.completions.update(existingCompletion.id, {
          completed: !existingCompletion.completed,
          timestamp: new Date(),
        });
        return !existingCompletion.completed;
      } else {
        // Create new completion
        const completion: Completion = {
          id: uuidv4(),
          habitId,
          date,
          completed: true,
          timestamp: new Date(),
        };
        
        await db.completions.add(completion);
        return true;
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      throw new DatabaseError('Failed to toggle completion', 'TOGGLE_COMPLETION_ERROR', error);
    }
  }, []);

  const setCompletionValue = useCallback(async (habitId: string, date: string, value: number) => {
    try {
      // Check if completion exists
      const existingCompletion = await db.completions
        .where('[habitId+date]')
        .equals([habitId, date])
        .first();

      const completionData = {
        habitId,
        date,
        value,
        completed: value > 0,
        timestamp: new Date(),
      };

      if (existingCompletion) {
        await db.completions.update(existingCompletion.id, completionData);
      } else {
        await db.completions.add({
          id: uuidv4(),
          ...completionData,
        });
      }
    } catch (error) {
      console.error('Error setting completion value:', error);
      throw new DatabaseError('Failed to set completion value', 'SET_COMPLETION_VALUE_ERROR', error);
    }
  }, []);

  const bulkToggleCompletions = useCallback(async (habitIds: string[], date: string, completed: boolean) => {
    try {
      await db.transaction('rw', db.completions, async () => {
        for (const habitId of habitIds) {
          const existingCompletion = await db.completions
            .where('[habitId+date]')
            .equals([habitId, date])
            .first();

          if (existingCompletion) {
            await db.completions.update(existingCompletion.id, {
              completed,
              timestamp: new Date(),
            });
          } else {
            await db.completions.add({
              id: uuidv4(),
              habitId,
              date,
              completed,
              timestamp: new Date(),
            });
          }
        }
      });
    } catch (error) {
      console.error('Error bulk toggling completions:', error);
      throw new DatabaseError('Failed to bulk toggle completions', 'BULK_TOGGLE_ERROR', error);
    }
  }, []);

  return {
    toggleCompletion,
    setCompletionValue,
    bulkToggleCompletions,
  };
}

// Hook for preferences operations
export function usePreferencesOperations() {
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      const validatedData = preferencesSchema.partial().parse(updates);
      
      // Get existing preferences or create default
      const existing = await db.preferences.toArray();
      
      if (existing.length > 0) {
        await db.preferences.update(existing[0].id || 'default', validatedData);
      } else {
        await db.preferences.add({
          id: 'default',
          theme: 'system',
          weeklyStartDay: 'monday',
          notifications: {
            enabled: true,
            morningTime: '08:00',
            eveningTime: '20:00',
          },
          defaultView: 'daily',
          showMotivationalQuotes: true,
          vibrationEnabled: false,
          soundEnabled: true,
          ...validatedData,
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new DatabaseError('Failed to update preferences', 'UPDATE_PREFERENCES_ERROR', error);
    }
  }, []);

  return {
    updatePreferences,
  };
}

// Hook for database statistics
export function useDatabaseStats() {
  return useLiveQuery(async () => {
    try {
      return await dbUtils.getStats();
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }, []);
}

// Hook for export/import functionality
export function useDataImportExport() {
  const exportData = useCallback(async () => {
    try {
      return await dbUtils.exportData();
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new DatabaseError('Failed to export data', 'EXPORT_ERROR', error);
    }
  }, []);

  const importData = useCallback(async (data: any) => {
    try {
      // Validate imported data structure
      if (!data.habits || !data.completions || !data.preferences) {
        throw new DatabaseError('Invalid data format', 'INVALID_DATA_FORMAT');
      }

      await dbUtils.importData(data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new DatabaseError('Failed to import data', 'IMPORT_ERROR', error);
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await dbUtils.clearAll();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new DatabaseError('Failed to clear data', 'CLEAR_ERROR', error);
    }
  }, []);

  return {
    exportData,
    importData,
    clearAllData,
  };
}