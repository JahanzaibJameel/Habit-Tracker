'use client';

import React, { forwardRef } from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onChange,
      label,
      description,
      disabled = false,
      size = 'md',
      className,
      showLabel = true,
    },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        container: 'h-5 w-9',
        circle: 'h-4 w-4',
        translate: 'translate-x-4',
      },
      md: {
        container: 'h-6 w-11',
        circle: 'h-5 w-5',
        translate: 'translate-x-5',
      },
      lg: {
        container: 'h-7 w-14',
        circle: 'h-6 w-6',
        translate: 'translate-x-7',
      },
    };

    const currentSize = sizeClasses[size];

    return (
      <HeadlessSwitch.Group>
        <div className={clsx('flex items-center', className)}>
          <HeadlessSwitch
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={clsx(
              'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              checked
                ? 'bg-primary-600 dark:bg-primary-500'
                : 'bg-secondary-300 dark:bg-secondary-700',
              disabled && 'cursor-not-allowed opacity-50',
              currentSize.container
            )}
          >
            <motion.span
              className={clsx(
                'inline-block transform rounded-full bg-white transition-transform',
                currentSize.circle
              )}
              animate={{
                x: checked ? currentSize.translate : 0,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </HeadlessSwitch>
          
          {showLabel && (label || description) && (
            <div className="ml-3">
              {label && (
                <HeadlessSwitch.Label
                  as="span"
                  className={clsx(
                    'text-sm font-medium',
                    disabled
                      ? 'text-secondary-400 dark:text-secondary-600'
                      : 'text-secondary-900 dark:text-secondary-100'
                  )}
                >
                  {label}
                </HeadlessSwitch.Label>
              )}
              {description && (
                <HeadlessSwitch.Description
                  as="span"
                  className={clsx(
                    'block text-xs',
                    disabled
                      ? 'text-secondary-400 dark:text-secondary-600'
                      : 'text-secondary-500 dark:text-secondary-400'
                  )}
                >
                  {description}
                </HeadlessSwitch.Description>
              )}
            </div>
          )}
        </div>
      </HeadlessSwitch.Group>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };