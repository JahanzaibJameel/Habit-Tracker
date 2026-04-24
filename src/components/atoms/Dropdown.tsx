import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/utils';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  isOpen,
  onOpenChange,
  placement = 'bottom-left',
  className,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !isClient) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    // Add event listeners with a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onOpenChange, isClient]);

  const placementClasses = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1',
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute z-50 w-48 bg-background border border-border rounded-md shadow-lg py-1',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        placementClasses[placement],
        className
      )}
    >
      {children}
    </div>
  );

  if (!isClient) {
    return (
      <div ref={triggerRef} className="relative">
        {trigger}
      </div>
    );
  }

  return (
    <div ref={triggerRef} className="relative">
      <div onClick={() => onOpenChange(!isOpen)}>{trigger}</div>
      {isOpen && dropdownContent}
    </div>
  );
};

export { Dropdown };
