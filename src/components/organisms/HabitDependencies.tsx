import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Link, Plus, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { Habit } from '../../types';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Switch } from '../atoms/Switch';

interface DependencyRule {
  id: string;
  type: 'completion' | 'streak' | 'time' | 'custom';
  sourceHabitId: string;
  targetHabitId: string;
  condition:
    | 'must_complete'
    | 'must_not_complete'
    | 'streak_greater'
    | 'streak_equal'
    | 'time_before'
    | 'time_after';
  value?: number;
  timeValue?: string;
  description: string;
  isActive: boolean;
}

interface HabitDependenciesProps {
  habits: Habit[];
  dependencies: DependencyRule[];
  onAddDependency: (dependency: Omit<DependencyRule, 'id'>) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onToggleDependency: (dependencyId: string) => void;
  onUpdateDependency: (dependencyId: string, updates: Partial<DependencyRule>) => void;
  isOpen: boolean;
  onClose: () => void;
}

const HabitDependencies: React.FC<HabitDependenciesProps> = ({
  habits,
  dependencies,
  onAddDependency,
  onUpdateDependency: _onUpdateDependency,
  onRemoveDependency,
  onToggleDependency,
  isOpen,
  onClose,
}) => {
  const [newDependency, setNewDependency] = useState<Partial<DependencyRule>>({
    type: 'completion',
    condition: 'must_complete',
    description: '',
    isActive: true,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const getHabitById = (id: string) => habits.find((h: Habit) => h.id === id);
  const getDependencyDescription = (dependency: DependencyRule) => {
    const sourceHabit = getHabitById(dependency.sourceHabitId);
    const targetHabit = getHabitById(dependency.targetHabitId);

    if (!sourceHabit || !targetHabit) {
      return 'Invalid dependency';
    }

    switch (dependency.condition) {
      case 'must_complete':
        return `Complete "${sourceHabit.name}" before "${targetHabit.name}"`;
      case 'must_not_complete':
        return `Don't complete "${sourceHabit.name}" before "${targetHabit.name}"`;
      case 'streak_greater':
        return `"${sourceHabit.name}" streak must be ${dependency.value || 1}+ days before "${targetHabit.name}"`;
      case 'streak_equal':
        return `"${sourceHabit.name}" streak must be exactly ${dependency.value || 1} days before "${targetHabit.name}"`;
      case 'time_before':
        return `Complete "${sourceHabit.name}" before ${dependency.timeValue} to enable "${targetHabit.name}"`;
      case 'time_after':
        return `Complete "${sourceHabit.name}" after ${dependency.timeValue} to enable "${targetHabit.name}"`;
      default:
        return dependency.description || 'Custom dependency';
    }
  };

  const handleAddDependency = () => {
    if (!newDependency.sourceHabitId || !newDependency.targetHabitId) {
      return;
    }
    if (newDependency.sourceHabitId === newDependency.targetHabitId) {
      return;
    }

    const dependencyData: Omit<DependencyRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: newDependency.type || 'completion',
      sourceHabitId: newDependency.sourceHabitId,
      targetHabitId: newDependency.targetHabitId,
      condition: newDependency.condition || 'must_complete',
      description: newDependency.description || '',
      isActive: newDependency.isActive !== false,
    };

    // Only add value and timeValue if they exist
    if (newDependency.value !== undefined) {
      (dependencyData as { value?: number }).value = newDependency.value;
    }
    if (newDependency.timeValue !== undefined) {
      (dependencyData as { timeValue?: number }).timeValue = Number(newDependency.timeValue);
    }

    onAddDependency(dependencyData);

    setNewDependency({
      type: 'completion',
      condition: 'must_complete',
      description: '',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleToggleDependency = (dependencyId: string, _checked: boolean) => {
    onToggleDependency(dependencyId);
  };

  const availableHabits = habits.filter((h: Habit) => !h.archivedAt);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Link className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-slate-900 dark:text-slate-100">Habit Dependencies</span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Add New Dependency */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Create Dependency Rule
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(!showAddForm)}
                      disabled={availableHabits.length < 2}
                    >
                      {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {showAddForm ? 'Cancel' : 'Add Rule'}
                    </Button>
                  </div>

                  {availableHabits.length < 2 && (
                    <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">
                        You need at least 2 active habits to create dependencies
                      </span>
                    </div>
                  )}

                  {showAddForm && availableHabits.length >= 2 && (
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Condition
                          </label>
                          <select
                            value={newDependency.condition || 'must_complete'}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                condition: e.target.value as DependencyRule['condition'],
                              }))
                            }
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select source habit</option>
                            {availableHabits.map((habit: Habit) => (
                              <option key={habit.id} value={habit.id}>
                                {habit.name} ({habit.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Source Habit (Prerequisite)
                          </label>
                          <select
                            value={newDependency.sourceHabitId || ''}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                sourceHabitId: e.target.value,
                              }))
                            }
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select source habit</option>
                            {availableHabits.map((habit: Habit) => (
                              <option key={habit.id} value={habit.id}>
                                {habit.name} ({habit.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Target Habit (Dependent)
                          </label>
                          <select
                            value={newDependency.targetHabitId || ''}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                targetHabitId: e.target.value,
                              }))
                            }
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            disabled={!newDependency.sourceHabitId}
                          >
                            <option value="">Select target habit</option>
                            {availableHabits
                              .filter((h: Habit) => h.id !== newDependency.sourceHabitId)
                              .map((habit: Habit) => (
                                <option key={habit.id} value={habit.id}>
                                  {habit.name} ({habit.category})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Rule Type
                          </label>
                          <select
                            value={newDependency.type || 'completion'}
                            onChange={(e) =>
                              setNewDependency((prev) => {
                                const updated = {
                                  ...prev,
                                  type: e.target.value as 'completion' | 'time' | 'streak',
                                };
                                // Reset condition when type changes to completion
                                if (e.target.value === 'completion') {
                                  (updated as { condition?: string }).condition = 'must_complete';
                                }
                                return updated;
                              })
                            }
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="completion">Completion Based</option>
                            <option value="streak">Streak Based</option>
                            <option value="time">Time Based</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Condition
                          </label>
                          <select
                            value={newDependency.condition || 'must_complete'}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                condition: e.target.value as DependencyRule['condition'],
                              }))
                            }
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            {newDependency.type === 'completion' && (
                              <>
                                <option value="must_complete">Must Complete</option>
                                <option value="must_not_complete">Must Not Complete</option>
                              </>
                            )}
                            {newDependency.type === 'streak' && (
                              <>
                                <option value="streak_greater">Streak Greater Than</option>
                                <option value="streak_equal">Streak Equal To</option>
                              </>
                            )}
                            {newDependency.type === 'time' && (
                              <>
                                <option value="time_before">Complete Before Time</option>
                                <option value="time_after">Complete After Time</option>
                              </>
                            )}
                            {newDependency.type === 'custom' && (
                              <option value="custom">Custom Condition</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {(newDependency.condition === 'streak_greater' ||
                        newDependency.condition === 'streak_equal') && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Streak Value
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={newDependency.value || ''}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                value: parseInt(e.target.value) || undefined,
                              }))
                            }
                            placeholder="Number of days"
                          />
                        </div>
                      )}

                      {(newDependency.condition === 'time_before' ||
                        newDependency.condition === 'time_after') && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Time
                          </label>
                          <Input
                            type="time"
                            value={newDependency.timeValue || ''}
                            onChange={(e) =>
                              setNewDependency((prev) => ({
                                ...prev,
                                timeValue: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          Description (Optional)
                        </label>
                        <Input
                          value={newDependency.description || ''}
                          onChange={(e) =>
                            setNewDependency((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Describe this dependency rule"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newDependency.isActive !== false}
                          onCheckedChange={(checked: boolean) =>
                            setNewDependency((prev) => ({
                              ...prev,
                              isActive: checked,
                            }))
                          }
                          label="Active"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddDependency}
                          disabled={!newDependency.sourceHabitId || !newDependency.targetHabitId}
                        >
                          Add Dependency
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing Dependencies */}
                {dependencies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Dependencies</h3>
                    <div className="space-y-3">
                      {dependencies.map((dependency) => {
                        const sourceHabit = getHabitById(dependency.sourceHabitId);
                        const targetHabit = getHabitById(dependency.targetHabitId);

                        return (
                          <div
                            key={dependency.id}
                            className={cn(
                              'p-4 rounded-lg border transition-colors',
                              dependency.isActive
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 opacity-60'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={cn(
                                      'w-2 h-2 rounded-full',
                                      dependency.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                    )}
                                  />
                                  <span className="font-medium">
                                    {getDependencyDescription(dependency)}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                                  <div className="flex items-center space-x-1">
                                    <span>From:</span>
                                    <span className="font-medium">{sourceHabit?.name}</span>
                                  </div>
                                  <ArrowRight className="h-3 w-3" />
                                  <div className="flex items-center space-x-1">
                                    <span>To:</span>
                                    <span className="font-medium">{targetHabit?.name}</span>
                                  </div>
                                </div>

                                {dependency.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                    {dependency.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={dependency.isActive}
                                  onCheckedChange={(checked: boolean) =>
                                    handleToggleDependency(dependency.id, checked)
                                  }
                                  size="sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveDependency(dependency.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {dependencies.length === 0 && (
                  <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                    <Link className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-lg font-medium mb-2">No dependencies yet</h3>
                    <p>
                      Create dependency rules to link habits together and build chains of positive
                      habits.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export { HabitDependencies };
