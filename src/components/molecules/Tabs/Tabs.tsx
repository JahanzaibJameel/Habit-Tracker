'use client';

import React, { createContext, useContext, useState } from 'react';
import { Tab } from '@headlessui/react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface TabsContextType {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  children: React.ReactNode;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function Tabs({
  children,
  defaultIndex = 0,
  onChange,
  className,
  variant = 'default',
}: TabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    onChange?.(index);
  };

  return (
    <TabsContext.Provider value={{ selectedIndex, setSelectedIndex }}>
      <Tab.Group selectedIndex={selectedIndex} onChange={handleChange}>
        <div className={className}>{children}</div>
      </Tab.Group>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function TabList({ children, className, fullWidth = false }: TabListProps) {
  return (
    <Tab.List
      className={clsx(
        'flex space-x-1',
        fullWidth && 'w-full',
        className
      )}
    >
      {children}
    </Tab.List>
  );
}

interface TabItemProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function TabItem({ children, disabled = false }: TabItemProps) {
  return (
    <Tab
      disabled={disabled}
      className={({ selected }) =>
        clsx(
          'relative rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
          selected
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200',
          disabled && 'cursor-not-allowed opacity-50'
        )
      }
    >
      {({ selected }) => (
        <>
          {children}
          {selected && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-primary-100 dark:bg-primary-900/20 -z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </>
      )}
    </Tab>
  );
}

interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return (
    <Tab.Panels className={clsx('mt-4', className)}>
      {children}
    </Tab.Panels>
  );
}

interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function TabPanel({ children, className, animate = true }: TabPanelProps) {
  const content = (
    <Tab.Panel className={className}>
      {children}
    </Tab.Panel>
  );

  if (animate) {
    return (
      <Tab.Panel className={className}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </Tab.Panel>
    );
  }

  return content;
}