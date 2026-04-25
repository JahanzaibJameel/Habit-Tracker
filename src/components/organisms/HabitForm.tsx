import React, { useEffect, useState } from 'react';
import { Plus, Tag, Target, X } from 'lucide-react';

import type { CreateHabit, UpdateHabit } from '../../contracts/habit-types';
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

const validateHabitForm = (data: any) => {
  const errors: any = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  if (!data.icon || data.icon.trim().length === 0) {
    errors.icon = 'Icon is required';
  } else if (data.icon.length > 50) {
    errors.icon = 'Icon must be less than 50 characters';
  }

  if (!data.color || !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    errors.color = 'Color must be a valid hex color';
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.category = 'Category is required';
  } else if (data.category.length > 50) {
    errors.category = 'Category must be less than 50 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const HabitForm: React.FC<HabitFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  habit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🎯',
    color: '#3b82f6',
    category: '',
    target: 1,
    unit: 'times',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    tags: [] as string[],
  });

  const [errors, setErrors] = useState<any>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name || '',
        description: habit.description || '',
        icon: habit.icon || '🎯',
        color: habit.color || '#3b82f6',
        category: habit.category || '',
        target: habit.target || 1,
        unit: habit.unit || 'times',
        frequency: habit.frequency || 'daily',
        tags: habit.tags || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '🎯',
        color: '#3b82f6',
        category: '',
        target: 1,
        unit: 'times',
        frequency: 'daily',
        tags: [],
      });
    }
  }, [habit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateHabitForm(formData);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev: any) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove),
    }));
  };

  const icons = ['🎯', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '🎨', '🎵', '💻', '📝'];
  const colors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#64748b',
  ];
  const categories = [
    'health',
    'fitness',
    'learning',
    'productivity',
    'mindfulness',
    'nutrition',
    'sleep',
    'creative',
    'work',
    'personal',
  ];

  const firstError =
    errors.name || errors.category || errors.description || errors.icon || errors.color;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={habit ? 'Edit Habit' : 'Create New Habit'}
      description="Build better habits by tracking your daily progress"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {firstError && (
          <div
            data-testid="validation-error"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {firstError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Habit Name"
            placeholder="e.g., Morning Meditation"
            error={errors.name}
            data-testid="habit-name-input"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />

          <div className="space-y-2">
            <label htmlFor="habit-category-select" className="text-sm font-medium">
              Category
            </label>
            <select
              id="habit-category-select"
              data-testid="habit-category-select"
              className={cn(
                'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                errors.category && 'border-red-500 focus-visible:ring-red-500'
              )}
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
          </div>
        </div>

        <Input
          label="Description"
          placeholder="What do you want to achieve?"
          error={errors.description}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />

        <div className="space-y-4">
          <label className="text-sm font-medium">Icon & Color</label>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1">
              <label className="mb-2 block text-xs text-gray-500">Choose Icon</label>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border-2 text-lg transition-colors',
                      formData.icon === icon
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    onClick={() => handleInputChange('icon', icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-xs text-gray-500">Choose Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-md border-2 transition-all',
                      formData.color === color
                        ? 'scale-110 border-gray-800'
                        : 'border-gray-300 hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
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
            error={errors.target}
            leftIcon={<Target className="h-4 w-4" />}
            data-testid="habit-target-input"
            value={formData.target}
            onChange={(e) => handleInputChange('target', parseInt(e.target.value) || 1)}
          />

          <Input
            label="Unit"
            placeholder="e.g., minutes, pages, glasses"
            error={errors.unit}
            value={formData.unit}
            onChange={(e) => handleInputChange('unit', e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((frequency) => (
              <Button
                key={frequency}
                type="button"
                variant={formData.frequency === frequency ? 'default' : 'outline'}
                onClick={() => handleInputChange('frequency', frequency)}
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
            {formData.tags.map((tag) => (
              <div
                key={tag}
                className="flex items-center space-x-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
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
                  addTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!newTag.trim() || formData.tags.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <Switch
              label="Make this habit public"
              description="Others can see your progress on this habit"
              checked={false}
              onChange={(checked) => console.log('Public setting:', checked)}
            />
          </div>
        </div>

        <div className="-mx-6 sticky bottom-0 flex justify-end space-x-3 border-t bg-white px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" data-testid="save-habit-button" disabled={isLoading}>
            {habit ? 'Update Habit' : 'Create Habit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { HabitForm };
