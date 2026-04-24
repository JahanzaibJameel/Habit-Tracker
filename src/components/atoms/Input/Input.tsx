import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const inputVariants = cva(
  'w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 placeholder:text-secondary-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-secondary-900 dark:placeholder:text-secondary-500',
  {
    variants: {
      variant: {
        default:
          'border-secondary-300 text-secondary-900 focus:border-primary-500 focus:ring-primary-500/20 dark:border-secondary-700 dark:text-secondary-100 dark:focus:border-primary-500',
        error:
          'border-error-300 text-error-900 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700 dark:text-error-100 dark:focus:border-error-500',
        success:
          'border-success-300 text-success-900 focus:border-success-500 focus:ring-success-500/20 dark:border-success-700 dark:text-success-100 dark:focus:border-success-500',
        warning:
          'border-warning-300 text-warning-900 focus:border-warning-500 focus:ring-warning-500/20 dark:border-warning-700 dark:text-warning-100 dark:focus:border-warning-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  animate?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      type = 'text',
      showPasswordToggle = type === 'password',
      animate = false,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = type === 'password' && showPassword ? 'text' : type;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon || showPasswordToggle;
    
    // Determine variant based on props
    let inputVariant: 'default' | 'error' | 'success' | 'warning' = 'default';
    if (error) inputVariant = 'error';
    else if (success) inputVariant = 'success';
    else if (warning) inputVariant = 'warning';

    const StatusIcon = () => {
      if (error) return <AlertCircle className="h-4 w-4 text-error-500" />;
      if (success) return <CheckCircle className="h-4 w-4 text-success-500" />;
      if (warning) return <AlertCircle className="h-4 w-4 text-warning-500" />;
      return null;
    };

    const inputContent = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          id={id}
          className={clsx(
            inputVariants({ variant: inputVariant, size, className }),
            hasLeftIcon && 'pl-9',
            hasRightIcon && 'pr-9',
            isFocused && 'shadow-sm'
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <StatusIcon />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          {!showPasswordToggle && rightIcon && (
            <div className="text-secondary-400">{rightIcon}</div>
          )}
        </div>
      </div>
    );

    const container = (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-secondary-900 dark:text-secondary-100"
          >
            {label}
          </label>
        )}
        {animate ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {inputContent}
          </motion.div>
        ) : (
          inputContent
        )}
        {(helperText || error || success || warning) && (
          <p
            className={clsx(
              'text-xs',
              error && 'text-error-600 dark:text-error-400',
              success && 'text-success-600 dark:text-success-400',
              warning && 'text-warning-600 dark:text-warning-400',
              !error && !success && !warning && 'text-secondary-500'
            )}
          >
            {error || success || warning || helperText}
          </p>
        )}
      </div>
    );

    return container;
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };