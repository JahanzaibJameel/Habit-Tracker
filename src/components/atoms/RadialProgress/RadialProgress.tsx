import React from 'react';
import { cn } from '@/lib/utils';

interface RadialProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  labelClassName?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
}

const variantClasses = {
  default: 'text-primary-500',
  success: 'text-success-500',
  warning: 'text-warning-500',
  error: 'text-error-500',
  primary: 'text-primary-500',
};

export function RadialProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  className,
  trackClassName,
  indicatorClassName,
  showLabel = true,
  labelClassName,
  variant = 'default',
}: RadialProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn('fill-none stroke-secondary-200 dark:stroke-secondary-800', trackClassName)}
        />
        
        {/* Progress indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn(
            'fill-none transition-all duration-500 ease-out',
            indicatorClassName || variantClasses[variant]
          )}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold', labelClassName || variantClasses[variant])}>
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-secondary-500">done</span>
        </div>
      )}
    </div>
  );
}