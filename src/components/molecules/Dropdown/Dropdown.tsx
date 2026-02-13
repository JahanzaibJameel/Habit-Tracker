'use client';

import React, { ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/atoms/Button/Button';

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: ReactNode;
  label?: string;
  align?: 'left' | 'right';
  triggerVariant?: ButtonProps['variant'];
  triggerSize?: ButtonProps['size'];
  className?: string;
}

export function Dropdown({
  items,
  trigger,
  label = 'Options',
  align = 'right',
  triggerVariant = 'outline',
  triggerSize = 'md',
  className,
}: DropdownProps) {
  const filteredItems = items.filter((item) => !item.separator);

  return (
    <Menu as="div" className={clsx('relative inline-block text-left', className)}>
      <div>
        <Menu.Button as={Fragment}>
          {trigger || (
            <Button
              variant={triggerVariant}
              size={triggerSize}
              rightIcon={<ChevronDown className="h-4 w-4" />}
            >
              {label}
            </Button>
          )}
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={clsx(
            'absolute mt-2 w-56 origin-top-right divide-y divide-secondary-100 rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:divide-secondary-800 dark:bg-secondary-900 dark:ring-white/10',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="px-1 py-1">
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <div
                    key={`separator-${index}`}
                    className="my-1 h-px bg-secondary-200 dark:bg-secondary-700"
                  />
                );
              }

              return (
                <Menu.Item key={item.label} disabled={item.disabled}>
                  {({ active }) => (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className={clsx(
                        'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors',
                        active
                          ? item.destructive
                            ? 'bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-300'
                            : 'bg-secondary-100 text-secondary-900 dark:bg-secondary-800 dark:text-secondary-100'
                          : item.destructive
                          ? 'text-error-600 dark:text-error-400'
                          : 'text-secondary-700 dark:text-secondary-300',
                        item.disabled && 'cursor-not-allowed opacity-50'
                      )}
                      onClick={item.onClick}
                      disabled={item.disabled}
                    >
                      {item.icon && (
                        <span className="mr-3 flex-shrink-0">{item.icon}</span>
                      )}
                      {item.label}
                    </motion.button>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

// More vertical dropdown variant
export function MoreDropdown({ items }: { items: DropdownItem[] }) {
  return (
    <Dropdown
      items={items}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      }
      align="right"
    />
  );
}