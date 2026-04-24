import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Tag, Target, X } from 'lucide-react';
import { z } from 'zod';

import type { CreateHabit, UpdateHabit } from '../../contracts/habit-schema';
import { cn } from '../../lib/utils';
import type { Habit } from '../../types';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Modal } from '../atoms/Modal';
import { Switch } from '../atoms/Switch';

interface HabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHabit | UpdateHabit) => void;
  habit?: Habit | null;
  isLoading?: boolean;
}

const habitFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon must be less than 50 characters'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),
  target: z
    .number()
    .min(1, 'Target must be at least 1')
    .max(10000, 'Target must be less than 10000'),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit must be less than 20 characters'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recurrencePattern: z
    .object({
      type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
      interval: z.number().min(1).max(365),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      endDate: z.date().optional(),
    })
    .optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});

type HabitFormData = z.infer<typeof habitFormSchema>;

const categoryOptions = [
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'learning', label: 'Learning' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'social', label: 'Social' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'finance', label: 'Finance' },
  { value: 'habits', label: 'Habits' },
  { value: 'other', label: 'Other' },
];

const iconOptions = ['🏃', '🧘', '📚', '💪', '🎯', '💧', '🥗', '😴', '🧠', '🎨'];

const colorOptions = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#64748b',
];

const defaultValues: HabitFormData = {
  name: '',
  description: '',
  icon: '🎯',
  color: '#3b82f6',
  category: 'habits',
  target: 1,
  unit: 'time',
  frequency: 'daily',
  isPublic: false,
  tags: [],
};

const HabitForm: React.FC<HabitFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  habit,
  isLoading = false,
}) => {
  const [newTag, setNewTag] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedTags = watch('tags');
  const watchedFrequency = watch('frequency');

  const firstError = useMemo(
    () =>
      errors.name?.message ||
      errors.category?.message ||
      errors.target?.message ||
      errors.unit?.message ||
      errors.description?.message,
    [errors.category, errors.description, errors.name, errors.target, errors.unit]
  );

  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description || '',
        icon: habit.icon || '🎯',
        color: habit.color || '#3b82f6',
        category: habit.category.toLowerCase(),
        target: habit.target,
        unit: habit.unit,
        frequency: habit.frequency,
        recurrencePattern: habit.recurrencePattern,
        dependencies: habit.dependencies,
        isPublic: habit.isPublic,
        tags: habit.tags,
      });
      return;
    }

    reset(defaultValues);
  }, [habit, reset]);

  const handleAddTag = () => {
    const currentTags = watchedTags || [];
    const trimmedTag = newTag.trim();

    if (trimmedTag && currentTags.length < 10 && !currentTags.includes(trimmedTag)) {
      setValue('tags', [...currentTags, trimmedTag], { shouldValidate: true });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue(
      'tags',
      currentTags.filter((tag) => tag !== tagToRemove),
      { shouldValidate: true }
    );
  };

  const handleFormSubmit = (data: HabitFormData) => {
    onSubmit(data);
    if (!habit) {
      reset(defaultValues);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={habit ? 'Edit Habit' : 'Create New Habit'}
      description="Build better habits by tracking your daily progress"
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
        {firstError && (
          <div
            data-testid="validation-error"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {firstError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Habit Name"
            placeholder="e.g., Morning Meditation"
            error={errors.name?.message}
            data-testid="habit-name-input"
            {...register('name')}
          />

          <div className="space-y-2">
            <label htmlFor="habit-category-select" className="text-sm font-medium">
              Category
            </label>
            <select
              id="habit-category-select"
              data-testid="habit-category-select"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                errors.category && 'border-destructive focus-visible:ring-destructive'
              )}
              {...register('category')}
            >
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category?.message && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>
        </div>

        <Input
          label="Description"
          placeholder="What do you want to achieve?"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="space-y-4">
          <label className="text-sm font-medium">Icon &amp; Color</label>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1">
              <label className="mb-2 block text-xs text-muted-foreground">Choose Icon</label>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border-2 text-lg transition-colors',
                      watch('icon') === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                    )}
                    onClick={() => setValue('icon', icon, { shouldValidate: true })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-xs text-muted-foreground">Choose Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-md border-2 transition-all',
                      watch('color') === color
                        ? 'scale-110 border-foreground'
                        : 'border-border hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color, { shouldValidate: true })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Target"
            type="number"
            placeholder="e.g., 30"
            error={errors.target?.message}
            leftIcon={<Target className="h-4 w-4" />}
            data-testid="habit-target-input"
            {...register('target', { valueAsNumber: true })}
          />

          <Input
            label="Unit"
            placeholder="e.g., minutes, pages, glasses"
            error={errors.unit?.message}
            {...register('unit')}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((frequency) => (
              <Button
                key={frequency}
                type="button"
                variant={watchedFrequency === frequency ? 'default' : 'outline'}
                onClick={() => setValue('frequency', frequency, { shouldValidate: true })}
                className="capitalize"
              >
                {frequency}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center text-sm font-medium">
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {(watchedTags || []).map((tag) => (
              <div
                key={tag}
                className="flex items-center space-x-1 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              placeholder="Add a tag..."
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={!newTag.trim() || (watchedTags || []).length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAdvanced((current) => !current)}
            className="w-full justify-between"
          >
            Advanced Settings
            <span className={cn('transition-transform', showAdvanced && 'rotate-180')}>▼</span>
          </Button>

          {showAdvanced && (
            <div className="rounded-lg bg-muted/50 p-4">
              <Controller
                name="isPublic"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Make this habit public"
                    description="Others can see your progress on this habit"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          )}
        </div>

        <div className="-mx-6 sticky bottom-0 flex justify-end space-x-3 border-t bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            data-testid="save-habit-button"
            disabled={isLoading}
            loading={isLoading}
          >
            {habit ? 'Update Habit' : 'Create Habit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { HabitForm };
