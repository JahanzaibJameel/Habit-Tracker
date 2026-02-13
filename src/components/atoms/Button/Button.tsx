import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus-visible:ring-secondary-500 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700',
        outline: 'border border-secondary-300 bg-transparent hover:bg-secondary-50 focus-visible:ring-secondary-500 dark:border-secondary-700 dark:hover:bg-secondary-800',
        ghost: 'hover:bg-secondary-100 focus-visible:ring-secondary-500 dark:hover:bg-secondary-800',
        danger: 'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500',
        success: 'bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 focus-visible:ring-warning-500',
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  motion?: boolean;
  disabled?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      motion = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const content = (
      <>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    );

    const baseClassName = buttonVariants({
      variant,
      size,
      fullWidth,
      className: clsx(
        'relative overflow-hidden',
        'after:absolute after:inset-0 after:bg-white/10 after:opacity-0 hover:after:opacity-100 after:transition-opacity',
        className
      ),
    });

    if (motion) {
      return (
        <motion.button
          ref={ref}
          className={baseClassName}
          disabled={disabled || isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          {...(props as HTMLMotionProps<'button'>)}
        >
          {content}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={baseClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };