import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium leading-6 text-slate-700 dark:text-slate-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className || ''
        )}
        {...props}
      >
        {children}
        {required && <span className="text-rose-500 dark:text-rose-400 ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };
