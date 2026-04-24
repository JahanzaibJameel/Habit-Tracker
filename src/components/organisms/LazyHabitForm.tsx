import React, { Suspense } from 'react';

import { LoadingSkeleton } from '../atoms/LoadingSkeleton';

// Lazy load heavy components
const HabitForm = React.lazy(() =>
  import('./HabitForm').then((module) => ({
    default: module.HabitForm,
  }))
);

const BatchOperations = React.lazy(() =>
  import('./BatchOperations').then((module) => ({
    default: module.BatchOperations,
  }))
);

const HabitDependencies = React.lazy(() =>
  import('./HabitDependencies').then((module) => ({
    default: module.HabitDependencies,
  }))
);

const BadgesModal = React.lazy(() =>
  import('./BadgesModal').then((module) => ({
    default: module.BadgesModal,
  }))
);

interface LazyHabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  habit?: any;
  isLoading?: boolean;
}

export const LazyHabitForm: React.FC<LazyHabitFormProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-96 w-full" />}>
      <HabitForm {...props} />
    </Suspense>
  );
};

interface LazyBatchOperationsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHabitIds: string[];
  habits: any[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchArchive: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchComplete: (ids: string[]) => void;
  onHabitSelection: (id: string) => void;
}

export const LazyBatchOperations: React.FC<LazyBatchOperationsProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-64 w-full" />}>
      <BatchOperations {...props} />
    </Suspense>
  );
};

interface LazyHabitDependenciesProps {
  isOpen: boolean;
  onClose: () => void;
  habits: any[];
  dependencies: any[];
  onAddDependency: (dep: any) => void;
  onRemoveDependency: (id: string) => void;
  onToggleDependency: (id: string) => void;
  onUpdateDependency: (id: string, updates: any) => void;
}

export const LazyHabitDependencies: React.FC<LazyHabitDependenciesProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-64 w-full" />}>
      <HabitDependencies {...props} />
    </Suspense>
  );
};

interface LazyBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: any[];
  unlockedBadges: string[];
  onUnlockBadge: (id: string) => void;
}

export const LazyBadgesModal: React.FC<LazyBadgesModalProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-64 w-full" />}>
      <BadgesModal {...props} />
    </Suspense>
  );
};
