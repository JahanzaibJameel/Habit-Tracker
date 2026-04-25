import React from 'react';

import { cn } from '../../lib/utils';
import type { Habit, HabitCompletion } from '../../types';
import { HabitCard } from '../organisms/HabitCard';

interface DraggableHabitCardProps {
  habit: Habit;
  completions: HabitCompletion[];
  isCompleted: boolean;
  isSelected: boolean;
  onToggleComplete: (habitId: string, value?: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onShare: (habit: Habit) => void;
  onToggleSelection: (habitId: string) => void;
  className?: string;
}

const DraggableHabitCard: React.FC<DraggableHabitCardProps> = ({
  habit,
  completions,
  isCompleted,
  isSelected,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  onShare,
  onToggleSelection,
  className,
}) => {
  return (
    <div
      className={cn('relative', className || '')}
      data-testid="habit-item"
      data-habit-id={habit.id}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={() => habit?.id && onToggleSelection(habit.id)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div>
        <HabitCard
          habit={habit}
          completions={completions}
          isCompleted={isCompleted}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onShare={onShare}
          className={cn(isSelected ? 'ring-2 ring-primary ring-offset-2' : '')}
        />
      </div>
    </div>
  );
};

export { DraggableHabitCard };
