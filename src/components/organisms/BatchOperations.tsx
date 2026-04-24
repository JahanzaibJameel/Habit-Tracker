import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, Calendar, Check, Tag, Trash2, X } from 'lucide-react';

import type { Habit } from '../../types';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Switch } from '../atoms/Switch';

interface BatchOperationsProps {
  selectedHabitIds: string[];
  habits: Habit[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchArchive: (habitIds: string[]) => void;
  onBatchDelete: (habitIds: string[]) => void;
  onBatchComplete: (habitIds: string[]) => void;
  onHabitSelection: (habitId: string, selected: boolean) => void;
  onClose: () => void;
  isOpen: boolean;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedHabitIds,
  habits,
  onSelectAll,
  onDeselectAll,
  onBatchArchive,
  onBatchDelete,
  onBatchComplete,
  onHabitSelection,
  onClose,
  isOpen,
}) => {
  const [batchAction, setBatchAction] = useState<'complete' | 'archive' | 'delete' | null>(null);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<{
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek: number[];
    dayOfMonth: number | null;
    endDate: Date | null;
  }>({
    type: 'daily',
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: null,
    endDate: null,
  });

  const selectedHabits = habits.filter((habit) => selectedHabitIds.includes(habit.id));
  const allSelected = selectedHabitIds.length === habits.length && habits.length > 0;

  const handleBatchAction = () => {
    if (!batchAction || selectedHabitIds.length === 0) return;

    switch (batchAction) {
      case 'complete':
        onBatchComplete(selectedHabitIds);
        break;
      case 'archive':
        onBatchArchive(selectedHabitIds);
        break;
      case 'delete':
        onBatchDelete(selectedHabitIds);
        break;
    }
    setBatchAction(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-background rounded-lg shadow-xl border max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    Batch Operations ({selectedHabitIds.length} selected)
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Selection Controls */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={allSelected ? onDeselectAll : onSelectAll}
                      disabled={habits.length === 0}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedHabitIds.length} of {habits.length} selected
                    </span>
                  </div>
                </div>

                {/* Batch Actions */}
                {selectedHabitIds.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Batch Actions</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        variant={batchAction === 'complete' ? 'default' : 'outline'}
                        onClick={() => setBatchAction('complete')}
                        className="flex items-center space-x-2"
                      >
                        <Check className="h-4 w-4" />
                        Mark Complete
                      </Button>

                      <Button
                        variant={batchAction === 'archive' ? 'default' : 'outline'}
                        onClick={() => setBatchAction('archive')}
                        className="flex items-center space-x-2"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>

                      <Button
                        variant={batchAction === 'delete' ? 'destructive' : 'outline'}
                        onClick={() => setBatchAction('delete')}
                        className="flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>

                    {batchAction && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">
                          Are you sure you want to {batchAction} {selectedHabitIds.length} habit(s)?
                        </p>
                        <div className="flex space-x-3">
                          <Button variant="outline" onClick={() => setBatchAction(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant={batchAction === 'delete' ? 'destructive' : 'default'}
                            onClick={handleBatchAction}
                          >
                            {batchAction === 'delete'
                              ? 'Delete'
                              : batchAction === 'archive'
                                ? 'Archive'
                                : 'Complete'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recurrence Pattern */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      Recurrence Pattern
                    </h3>
                    <Switch
                      checked={showRecurrenceOptions}
                      onChange={(checked) => setShowRecurrenceOptions(checked)}
                      label="Enable recurrence"
                    />
                  </div>

                  {showRecurrenceOptions && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Type</label>
                          <select
                            value={recurrencePattern.type}
                            onChange={(e) =>
                              setRecurrencePattern((prev) => ({
                                ...prev,
                                type: e.target.value as any,
                              }))
                            }
                            className="w-full p-2 border rounded-md bg-background"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Interval</label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={recurrencePattern.interval}
                            onChange={(e) =>
                              setRecurrencePattern((prev) => ({
                                ...prev,
                                interval: parseInt(e.target.value) || 1,
                              }))
                            }
                            placeholder="Repeat every..."
                          />
                        </div>
                      </div>

                      {['weekly', 'custom'].includes(recurrencePattern.type) && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Days of Week</label>
                          <div className="grid grid-cols-7 gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                              <label key={day} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={recurrencePattern.daysOfWeek?.includes(index)}
                                  onChange={(e) => {
                                    const days = recurrencePattern.daysOfWeek || [];
                                    if (e.target.checked) {
                                      setRecurrencePattern((prev) => ({
                                        ...prev,
                                        daysOfWeek: [...days, index].sort(),
                                      }));
                                    } else {
                                      setRecurrencePattern((prev) => ({
                                        ...prev,
                                        daysOfWeek: days.filter((d) => d !== index),
                                      }));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{day}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {['monthly', 'custom'].includes(recurrencePattern.type) && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Day of Month</label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={recurrencePattern.dayOfMonth || ''}
                            onChange={(e) =>
                              setRecurrencePattern((prev) => ({
                                ...prev,
                                dayOfMonth: parseInt(e.target.value) || null,
                              }))
                            }
                            placeholder="Day of month (1-31)"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          End Date (Optional)
                        </label>
                        <Input
                          type="date"
                          value={recurrencePattern.endDate?.toISOString().split('T')[0] || ''}
                          onChange={(e) =>
                            setRecurrencePattern((prev) => ({
                              ...prev,
                              endDate: e.target.value ? new Date(e.target.value) : null,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Habits Summary */}
                {selectedHabitIds.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-3">Selected Habits</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedHabits.map((habit) => (
                        <div
                          key={habit.id}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedHabitIds.includes(habit.id)}
                              onChange={(e) => onHabitSelection(habit.id, e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">{habit.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {habit.category}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{habit.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { BatchOperations };
