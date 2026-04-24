'use client';

import React, { ReactNode } from 'react';
import { Tooltip as HeadlessTooltip } from '@headlessui/react';
import { motion } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 0,
  disabled = false,
  className,
}: TooltipProps) {
  if (disabled) {
    return children;
  }

  return (
    <HeadlessTooltip>
      {({ open }) => (
        <div className="relative inline-block">
          <HeadlessTooltip.Trigger as="div">
            {children}
          </HeadlessTooltip.Trigger>
          {open && (
            <HeadlessTooltip.Panel
              static
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-50 ${positionClasses[position]}
                whitespace-nowrap rounded-lg bg-secondary-900 px-3 py-1.5 text-sm text-white shadow-lg
                before:absolute before:border-4 before:border-transparent
                ${
                  position === 'top' &&
                  'before:top-full before:left-1/2 before:-translate-x-1/2 before:border-t-secondary-900'
                }
                ${
                  position === 'right' &&
                  'before:top-1/2 before:right-full before:-translate-y-1/2 before:border-r-secondary-900'
                }
                ${
                  position === 'bottom' &&
                  'before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-b-secondary-900'
                }
                ${
                  position === 'left' &&
                  'before:top-1/2 before:left-full before:-translate-y-1/2 before:border-l-secondary-900'
                }
                ${className}
              `}
            >
              {content}
            </HeadlessTooltip.Panel>
          )}
        </div>
      )}
    </HeadlessTooltip>
  );
}