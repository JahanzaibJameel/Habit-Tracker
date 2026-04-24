import React, { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const cardVariants = cva('rounded-xl border bg-white dark:bg-secondary-900', {
  variants: {
    variant: {
      default: 'border-secondary-200 dark:border-secondary-800',
      elevated: 'border-transparent shadow-medium',
      outlined: 'border-secondary-300 dark:border-secondary-700',
      ghost: 'border-transparent bg-transparent dark:bg-transparent',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    },
    hoverable: {
      true: 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  animate?: boolean;
  animationDelay?: number;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, hoverable, animate, animationDelay = 0, ...props },
    ref
  ) => {
    const baseClassName = cardVariants({ variant, padding, hoverable, className });

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={baseClassName}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: animationDelay }}
          {...props}
        />
      );
    }

    return <div ref={ref} className={baseClassName} {...props} />;
  }
);

Card.displayName = 'Card';

// Card Subcomponents
const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx(
      'text-lg font-semibold leading-none tracking-tight text-secondary-900 dark:text-secondary-100',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx('text-sm text-secondary-500 dark:text-secondary-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx('pt-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex items-center pt-4', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};