import React from 'react';

import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className, children }) => {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)}>{children}</div>;
};

export const HabitCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card rounded-lg border p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <LoadingSkeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <LoadingSkeleton className="h-3 w-full" />
        <LoadingSkeleton className="h-3 w-2/3" />
      </div>
      <div className="flex items-center justify-between pt-4">
        <LoadingSkeleton className="h-8 w-20 rounded-md" />
        <LoadingSkeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
};

export const ButtonSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <LoadingSkeleton className={cn('h-10 w-24 rounded-md', className)} />;
};
