import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        secondary: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        destructive: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
        outline: 'border border-slate-300 text-slate-800 dark:border-slate-600 dark:text-slate-300',
        common: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        rare: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        legendary: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    const classes = [badgeVariants({ variant, size })];
    if (className) {
      classes.push(className);
    }
    
    return (
      <div
        ref={ref}
        className={cn(...classes)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
