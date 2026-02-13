'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as ToastRadix from '@radix-ui/react-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
};

const toastColors = {
  success: 'bg-success-50 border-success-200 text-success-900 dark:bg-success-900/20 dark:border-success-800 dark:text-success-100',
  error: 'bg-error-50 border-error-200 text-error-900 dark:bg-error-900/20 dark:border-error-800 dark:text-error-100',
  warning: 'bg-warning-50 border-warning-200 text-warning-900 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-100',
  info: 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-100',
  loading: 'bg-secondary-50 border-secondary-200 text-secondary-900 dark:bg-secondary-900/20 dark:border-secondary-800 dark:text-secondary-100',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastViewport />
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, toast.type, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={clsx(
        'fixed right-4 top-4 z-[100] flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg',
        toastColors[toast.type]
      )}
    >
      <div className="flex-shrink-0">
        {toast.type === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm opacity-90">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded p-1 hover:bg-white/10"
        aria-label="Close toast"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function ToastViewport() {
  return (
    <ToastRadix.Viewport className="fixed right-0 top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:flex-col md:max-w-[420px]" />
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Convenience hooks
export function useToastHelpers() {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, type: 'error' }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, type: 'warning' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, type: 'info' }),
    loading: (title: string, description?: string) =>
      addToast({ title, description, type: 'loading', duration: 0 }),
  };
}