import React, { forwardRef } from 'react';

import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onChange'
> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  checked?: boolean | undefined;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      size = 'md',
      disabled,
      checked,
      onCheckedChange,
      id,
      onClick: _onClick,
      ...props
    },
    _ref
  ) => {
    const switchId = id || `switch-${label?.replace(/\s+/g, '-').toLowerCase() || 'toggle'}`;

    const sizeClasses = {
      sm: 'h-4 w-7',
      md: 'h-5 w-9',
      lg: 'h-6 w-11',
    };

    const thumbSizeClasses = {
      sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
      md: 'h-4 w-4 data-[state=checked]:translate-x-4',
      lg: 'h-5 w-5 data-[state=checked]:translate-x-5',
    };

    return (
      <div className="flex items-center space-x-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          className={cn(
            'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-300 dark:bg-slate-600',
            sizeClasses[size],
            className || ''
          )}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!disabled && onCheckedChange) {
              e.preventDefault();
              onCheckedChange(!checked);
            }
          }}
          data-state={checked ? 'checked' : 'unchecked'}
          ref={_ref}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
              thumbSizeClasses[size]
            )}
            data-state={checked ? 'checked' : 'unchecked'}
          />
        </button>

        {(label || description) && (
          <div className="grid gap-1.5 leading-none">
            {label && (
              <label
                htmlFor={switchId}
                className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
