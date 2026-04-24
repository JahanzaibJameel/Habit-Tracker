import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit?.id || '',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', className)}
      data-testid="habit-item"
      data-habit-id={habit.id}
      {...attributes}
      {...listeners}
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

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ scale: 1.05, rotate: 2 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <HabitCard
          habit={habit}
          completions={completions}
          isCompleted={isCompleted}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onShare={onShare}
          className={cn(
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            isSelected && 'ring-2 ring-primary ring-offset-2'
          )}
        />
      </motion.div>
    </div>
  );
};

export { DraggableHabitCard };
