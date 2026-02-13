import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { db } from '@/db'
import { habitSchema } from '@/lib/schemas'
import { v4 as uuidv4 } from 'uuid'
import type { Habit } from '@/types'

// Fetch habits with React Query
export const useHabits = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.habits,
    queryFn: async () => {
      const habits = await db.habits.toArray()
      return habits.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
    ...options,
  })
}

// Fetch single habit
export const useHabit = (id: string, options = {}) => {
  return useQuery({
    queryKey: queryKeys.habit(id),
    queryFn: async () => {
      const habit = await db.habits.get(id)
      if (!habit) {
        throw new Error(`Habit with id ${id} not found`)
      }
      return habit
    },
    enabled: !!id,
    ...options,
  })
}

// Add habit mutation with optimistic updates
export const useAddHabit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => {
      // Validate input
      const validatedData = habitSchema.parse(habitData)
      
      const habit: Habit = {
        ...validatedData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
        tags: validatedData.tags || [],
      }
      
      await db.habits.add(habit)
      return habit
    },
    onMutate: async (newHabit) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.habits })
      
      // Snapshot previous value
      const previousHabits = queryClient.getQueryData(queryKeys.habits) as Habit[]
      
      // Optimistically update
      const optimisticHabit: Habit = {
        ...newHabit,
        id: 'temp-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
        tags: newHabit.tags || [],
      }
      
      queryClient.setQueryData(queryKeys.habits, (old: Habit[] = []) => [
        optimisticHabit,
        ...old,
      ])
      
      return { previousHabits }
    },
    onError: (err, newHabit, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.habits, context?.previousHabits)
      console.error('Failed to add habit:', err)
    },
    onSuccess: (data) => {
      // Replace optimistic habit with real one
      queryClient.setQueryData(queryKeys.habits, (old: Habit[] = []) =>
        old.map(habit => 
          habit.id.startsWith('temp-') ? data : habit
        ).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      )
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.habits })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

// Update habit mutation
export const useUpdateHabit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const habit = await db.habits.get(id)
      if (!habit) {
        throw new Error(`Habit with id ${id} not found`)
      }
      
      const updatedHabit = {
        ...habit,
        ...updates,
        updatedAt: new Date(),
      }
      
      await db.habits.update(id, updatedHabit)
      return updatedHabit
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits })
      await queryClient.cancelQueries({ queryKey: queryKeys.habit(id) })
      
      const previousHabits = queryClient.getQueryData(queryKeys.habits) as Habit[]
      const previousHabit = queryClient.getQueryData(queryKeys.habit(id))
      
      // Optimistically update habits list
      queryClient.setQueryData(queryKeys.habits, (old: Habit[] = []) =>
        old.map(habit =>
          habit.id === id ? { ...habit, ...updates, updatedAt: new Date() } : habit
        )
      )
      
      // Optimistically update single habit
      queryClient.setQueryData(queryKeys.habit(id), (old: Habit | undefined) =>
        old ? { ...old, ...updates, updatedAt: new Date() } : undefined
      )
      
      return { previousHabits, previousHabit }
    },
    onError: (err, variables, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(queryKeys.habits, context.previousHabits)
      }
      if (context?.previousHabit) {
        queryClient.setQueryData(queryKeys.habit(variables.id), context.previousHabit)
      }
      console.error('Failed to update habit:', err)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits })
      queryClient.invalidateQueries({ queryKey: queryKeys.habit(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

// Delete habit mutation
export const useDeleteHabit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const habit = await db.habits.get(id)
      if (!habit) {
        throw new Error(`Habit with id ${id} not found`)
      }
      
      // Delete in transaction
      await db.transaction('rw', db.habits, db.completions, async () => {
        await db.habits.delete(id)
        await db.completions.where('habitId').equals(id).delete()
      })
      
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits })
      
      const previousHabits = queryClient.getQueryData(queryKeys.habits) as Habit[]
      
      // Optimistically remove
      queryClient.setQueryData(queryKeys.habits, (old: Habit[] = []) =>
        old.filter(habit => habit.id !== id)
      )
      
      return { previousHabits }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(queryKeys.habits, context?.previousHabits)
      console.error('Failed to delete habit:', err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits })
      queryClient.invalidateQueries({ queryKey: queryKeys.completions() })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}

// Bulk update habits
export const useBulkUpdateHabits = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: Partial<Habit> }>) => {
      await db.transaction('rw', db.habits, async () => {
        for (const { id, updates: habitUpdates } of updates) {
          const habit = await db.habits.get(id)
          if (habit) {
            await db.habits.update(id, {
              ...habit,
              ...habitUpdates,
              updatedAt: new Date(),
            })
          }
        }
      })
      return updates
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits })
      
      const previousHabits = queryClient.getQueryData(queryKeys.habits) as Habit[]
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.habits, (old: Habit[] = []) =>
        old.map(habit => {
          const update = updates.find(u => u.id === habit.id)
          return update ? { ...habit, ...update.updates, updatedAt: new Date() } : habit
        })
      )
      
      return { previousHabits }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKeys.habits, context?.previousHabits)
      console.error('Failed to bulk update habits:', err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}