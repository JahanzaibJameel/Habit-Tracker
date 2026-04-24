'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette,
  Smile,
  Target,
  Calendar as CalendarIcon,
  Tag,
  X,
  Save,
  Plus,
  Hash,
  Clock,
  Bell,
  Repeat,
  Sparkles,
  Check,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import DayPicker from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { Card, CardContent } from '@/components/atoms/Card/Card';
import { Switch } from '@/components/atoms/Switch/Switch';
import { Tabs, TabList, TabItem, TabPanels, TabPanel } from '@/components/molecules/Tabs/Tabs';
import { useToastHelpers } from '@/components/molecules/Toast/Toast';
import { habitSchema, type HabitInput } from '@/lib/schemas';
import { useAddHabit, useUpdateHabit } from '@/lib/hooks/useHabitsQuery';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';

interface HabitFormProps {
  habit?: Habit;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  className?: string;
}

const defaultSchedule = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

const defaultValues: HabitInput = {
  name: '',
  description: '',
  color: '#3b82f6',
  icon: '🌟',
  goal: 5,
  schedule: defaultSchedule,
  category: '',
  tags: [],
};

const categoryOptions = [
  'Health & Fitness',
  'Learning & Growth',
  'Productivity',
  'Mindfulness',
  'Social',
  'Financial',
  'Personal',
  'Work',
  'Other',
];

const tagOptions = [
  'morning',
  'evening',
  'daily',
  'weekly',
  'challenging',
  'easy',
  'fun',
  'important',
  'optional',
  'health',
  'mindfulness',
  'exercise',
  'learning',
];

export function HabitForm({
  habit,
  onSuccess,
  onCancel,
  mode = 'create',
  className,
}: HabitFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(habit?.tags || []);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const toast = useToastHelpers();
  const { mutate: addHabit, isLoading: isAdding } = useAddHabit();
  const { mutate: updateHabit, isLoading: isUpdating } = useUpdateHabit();
  
  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    defaultValues: habit ? {
      name: habit.name,
      description: habit.description || '',
      color: habit.color,
      icon: habit.icon,
      goal: habit.goal,
      schedule: habit.schedule,
      category: habit.category || '',
      tags: habit.tags,
    } : defaultValues,
  });
  
  const watchedColor = watch('color');
  const watchedIcon = watch('icon');
  const watchedGoal = watch('goal');
  const watchedSchedule = watch('schedule');
  
  const isLoading = isAdding || isUpdating;
  
  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description || '',
        color: habit.color,
        icon: habit.icon,
        goal: habit.goal,
        schedule: habit.schedule,
        category: habit.category || '',
        tags: habit.tags,
      });
      setSelectedTags(habit.tags || []);
    }
  }, [habit, reset]);
  
  const onSubmit = (data: HabitInput) => {
    const submissionData = {
      ...data,
      tags: selectedTags,
    };
    
    if (mode === 'create') {
      addHabit(submissionData, {
        onSuccess: () => {
          toast.success('Habit created!', `"${data.name}" has been added to your habits.`);
          reset(defaultValues);
          setSelectedTags([]);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Failed to create habit', error.message);
        },
      });
    } else {
      if (!habit) return;
      
      updateHhabit(
        { id: habit.id, updates: submissionData },
        {
          onSuccess: () => {
            toast.success('Habit updated!', `"${data.name}" has been updated.`);
            onSuccess?.();
          },
          onError: (error) => {
            toast.error('Failed to update habit', error.message);
          },
        }
      );
    }
  };
  
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
    setValue('tags', selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]);
  };
  
  const handleScheduleToggle = (day: keyof typeof defaultSchedule) => {
    const newSchedule = { ...watchedSchedule, [day]: !watchedSchedule[day] };
    setValue('schedule', newSchedule, { shouldDirty: true });
  };
  
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={formVariants}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultIndex={activeTab} onChange={setActiveTab}>
          <TabList>
            <TabItem>Basic Info</TabItem>
            <TabItem>Schedule</TabItem>
            <TabItem>Advanced</TabItem>
          </TabList>
          
          <TabPanels>
            {/* Basic Info Tab */}
            <TabPanel animate>
              <motion.div
                variants={tabVariants}
                className="space-y-6"
              >
                {/* Icon & Color Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="mb-2 block text-sm font-medium">Icon</label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-16 w-full"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{watchedIcon}</span>
                            <div>
                              <p className="font-medium">Select Icon</p>
                              <p className="text-sm text-secondary-500">Choose an emoji</p>
                            </div>
                          </div>
                        </Button>
                        
                        <AnimatePresence>
                          {showEmojiPicker && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute left-0 top-full z-50 mt-2"
                            >
                              <div className="rounded-xl border border-secondary-200 bg-white shadow-2xl dark:border-secondary-800 dark:bg-secondary-900">
                                <EmojiPicker
                                  onEmojiClick={(emojiData) => {
                                    setValue('icon', emojiData.emoji, { shouldDirty: true });
                                    setShowEmojiPicker(false);
                                  }}
                                  autoFocusSearch={false}
                                  theme={Theme.AUTO}
                                  emojiStyle={EmojiStyle.NATIVE}
                                  width={300}
                                  height={400}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {errors.icon && (
                        <p className="mt-1 text-sm text-error-600">{errors.icon.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="mb-2 block text-sm font-medium">Color</label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-16 w-full"
                          onClick={() => setShowColorPicker(!showColorPicker)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-lg"
                              style={{ backgroundColor: watchedColor }}
                            />
                            <div>
                              <p className="font-medium">Select Color</p>
                              <p className="text-sm text-secondary-500">{watchedColor}</p>
                            </div>
                          </div>
                        </Button>
                        
                        <AnimatePresence>
                          {showColorPicker && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute left-0 top-full z-50 mt-2"
                            >
                              <Card className="p-4">
                                <HexColorPicker
                                  color={watchedColor}
                                  onChange={(color) => setValue('color', color, { shouldDirty: true })}
                                />
                                <div className="mt-3 flex gap-2">
                                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                                      style={{ backgroundColor: color }}
                                      onClick={() => setValue('color', color, { shouldDirty: true })}
                                    />
                                  ))}
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {errors.color && (
                        <p className="mt-1 text-sm text-error-600">{errors.color.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      label="Habit Name"
                      placeholder="e.g., Morning Meditation"
                      {...register('name')}
                      error={errors.name?.message}
                      leftIcon={<Hash className="h-4 w-4" />}
                    />
                    
                    <Input
                      label="Description"
                      placeholder="What's this habit about?"
                      {...register('description')}
                      error={errors.description?.message}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    />
                    
                    <div>
                      <label className="mb-2 block text-sm font-medium">Weekly Goal</label>
                      <div className="flex items-center gap-3">
                        <Controller
                          name="goal"
                          control={control}
                          render={({ field }) => (
                            <div className="flex-1">
                              <input
                                type="range"
                                min="1"
                                max="7"
                                step="1"
                                {...field}
                                className="w-full"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                              <div className="mt-1 flex justify-between text-xs text-secondary-500">
                                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                  <span key={num}>{num}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        />
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                          {watchedGoal}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-secondary-500">
                        How many times per week do you want to do this?
                      </p>
                      {errors.goal && (
                        <p className="mt-1 text-sm text-error-600">{errors.goal.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>
            
            {/* Schedule Tab */}
            <TabPanel animate>
              <motion.div
                variants={tabVariants}
                className="space-y-6"
              >
                <div>
                  <label className="mb-4 block text-sm font-medium">Select Days</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(watchedSchedule).map(([day, enabled]) => (
                      <button
                        key={day}
                        type="button"
                        className={cn(
                          'flex flex-col items-center justify-center rounded-xl p-4 transition-all',
                          enabled
                            ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-900 dark:text-primary-300 dark:ring-primary-400'
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-400 dark:hover:bg-secondary-700'
                        )}
                        onClick={() => handleScheduleToggle(day as keyof typeof defaultSchedule)}
                      >
                        <span className="text-sm font-medium capitalize">{day.slice(0, 3)}</span>
                        <span className="text-xs opacity-75">
                          {enabled ? '✓' : '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-medium">Quick Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Weekdays', schedule: { ...defaultSchedule, saturday: false, sunday: false } },
                      { label: 'Every Day', schedule: Object.fromEntries(Object.keys(defaultSchedule).map(day => [day, true])) },
                      { label: 'Weekends', schedule: { ...defaultSchedule, monday: false, tuesday: false, wednesday: false, thursday: false, friday: false } },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue('schedule', preset.schedule, { shouldDirty: true })}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-900">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-secondary-500" />
                    <div>
                      <p className="font-medium">Schedule Summary</p>
                      <p className="text-sm text-secondary-500">
                        {Object.values(watchedSchedule).filter(Boolean).length} days per week
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>
            
            {/* Advanced Tab */}
            <TabPanel animate>
              <motion.div
                variants={tabVariants}
                className="space-y-6"
              >
                <Input
                  label="Category"
                  placeholder="e.g., Health & Fitness"
                  {...register('category')}
                  error={errors.category?.message}
                  leftIcon={<Tag className="h-4 w-4" />}
                />
                
                <div>
                  <label className="mb-2 block text-sm font-medium">Tags</label>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className="ml-1 hover:text-primary-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={cn(
                          'rounded-full px-3 py-1 text-sm transition-colors',
                          selectedTags.includes(tag)
                            ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                            : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700'
                        )}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-900">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-secondary-500" />
                    <div>
                      <p className="font-medium">Advanced Settings</p>
                      <p className="text-sm text-secondary-500">
                        Additional customization options coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabPanel>
          </TabPanels>
        </Tabs>
        
        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-secondary-200 pt-6 dark:border-secondary-800">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={!isDirty || isLoading}
            >
              Reset
            </Button>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            motion
          >
            {mode === 'create' ? 'Create Habit' : 'Update Habit'}
          </Button>
        </div>
      </form>
      
      {/* Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <div className="mb-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-success-500" />
          <span className="font-medium">Preview</span>
        </div>
        
        <Card className="border-2 border-dashed border-secondary-300 dark:border-secondary-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${watchedColor}20` }}
              >
                {watchedIcon}
              </div>
              <div>
                <h4 className="font-semibold">
                  {watch('name') || 'New Habit'}
                </h4>
                <p className="text-sm text-secondary-500">
                  {watch('description') || 'No description'}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {watchedGoal}/week
                  </span>
                  <span className="text-secondary-500">
                    {Object.values(watchedSchedule).filter(Boolean).length} days
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}