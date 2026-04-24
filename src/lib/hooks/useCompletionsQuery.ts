import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { db } from '@/db'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import type { Completion } from '@/types'

// Fetch completions for a date
export const useCompletions = (date?: string) => {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd')
  
  return useQuery({
    queryKey: queryKeys.completions(targetDate),
    queryFn: async () => {
      if (date) {
        return await db.completions
          .where('date')
          .equals(date)
          .toArray()
      }
      return await db.completions.toArray()
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

// Toggle completion mutation
export const useToggleCompletion = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      habitId, 
      date = format(new Date(), 'yyyy-MM-dd') 
    }: { 
      habitId: string; 
      date?: string 
    }) => {
      const existing = await db.completions
        .where('[habitId+date]')
        .equals([habitId, date])
        .first()

      if (existing) {
        // Toggle
        await db.completions.update(existing.id, {
          completed: !existing.completed,
          timestamp: new Date(),
        })
        return { ...existing, completed: !existing.completed }
      } else {
        // Create
        const completion: Completion = {
          id: uuidv4(),
          habitId,
          date,
          completed: true,
          timestamp: new Date(),
        }
        await db.completions.add(completion)
        return completion
      }
    },
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.completions(date) })
      
      const previousCompletions = queryClient.getQueryData(
        queryKeys.completions(date)
      ) as Completion[]
      
      const existing = previousCompletions?.find(
        c => c.habitId === habitId && c.date === date
      )
      
      if (existing) {
        // Optimistically toggle
        queryClient.setQueryData(
          queryKeys.completions(date),
          (old: Completion[] = []) =>
            old.map(c =>
              c.habitId === habitId && c.date === date
                ? { ...c, completed: !c.completed, timestamp: new Date() }
                : c
            )
        )
      } else {
        // Optimistically add
        const optimisticCompletion: Completion = {
          id: 'temp-' + Date.now(),
          habitId,
          date,
          completed: true,
          timestamp: new Date(),
        }
        queryClient.setQueryData(
          queryKeys.completions(date),
          (old: Completion[] = []) => [...old, optimisticCompletion]
        )
      }
      
      return { previousCompletions }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.completions(variables.date),
        context?.previousCompletions
      )
      console.error('Failed to toggle completion:', err)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.completions(variables.date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks })
    },
  })
}

// Bulk toggle completions
export const useBulkToggleCompletions = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      habitIds,
      date,
      completed,
    }: {
      habitIds: string[];
      date: string;
      completed: boolean;
    }) => {
      await db.transaction('rw', db.completions, async () => {
        for (const habitId of habitIds) {
          const existing = await db.completions
            .where('[habitId+date]')
            .equals([habitId, date])
            .first()

          if (existing) {
            await db.completions.update(existing.id, {
              completed,
              timestamp: new Date(),
            })
          } else {
            await db.completions.add({
              id: uuidv4(),
              habitId,
              date,
              completed,
              timestamp: new Date(),
            })
          }
        }
      })
      return { habitIds, date, completed }
    },
    onMutate: async ({ habitIds, date, completed }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.completions(date) })
      
      const previousCompletions = queryClient.getQueryData(
        queryKeys.completions(date)
      ) as Completion[]
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.completions(date),
        (old: Completion[] = []) => {
          const updated = [...old]
          
          habitIds.forEach(habitId => {
            const index = updated.findIndex(
              c => c.habitId === habitId && c.date === date
            )
            
            if (index > -1) {
              updated[index] = {
                ...updated[index],
                completed,
                timestamp: new Date(),
              }
            } else {
              updated.push({
                id: 'temp-' + Date.now() + '-' + habitId,
                habitId,
                date,
                completed,
                timestamp: new Date(),
              })
            }
          })
          
          return updated
        }
      )
      
      return { previousCompletions }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.completions(variables.date),
        context?.previousCompletions
      )
      console.error('Failed to bulk toggle completions:', err)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.completions(variables.date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    },
  })
}