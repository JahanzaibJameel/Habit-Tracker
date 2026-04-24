'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

let toastId = 0;

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [id] = useState(() => `toast-${++toastId}`);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex items-center space-x-3 p-4 rounded-lg border shadow-lg max-w-md',
            getColors()
          )}
        >
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="flex-1 text-sm font-medium">{message}</div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast container for managing multiple toasts
export function ToastContainer() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; props: ToastProps; timer?: NodeJS.Timeout }>
  >([]);

  const addToast = (props: Omit<ToastProps, 'onClose'>) => {
    const id = `toast-${++toastId}`;
    const newToast = { id, props };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = props.duration ?? 3000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration + 300); // Add animation time

      // Store timer reference for cleanup
      setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, timer } : toast)));
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.timer) {
        clearTimeout(toast.timer);
      }
      return prev.filter((toast) => toast.id !== id);
    });
  };

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      toasts.forEach((toast) => {
        if (toast.timer) {
          clearTimeout(toast.timer);
        }
      });
    };
  }, [toasts]);

  // Expose toast methods globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).toast = {
        success: (message: string, duration?: number) =>
          addToast({ message, type: 'success', duration: duration ?? 3000 }),
        error: (message: string, duration?: number) =>
          addToast({ message, type: 'error', duration: duration ?? 3000 }),
        warning: (message: string, duration?: number) =>
          addToast({ message, type: 'warning', duration: duration ?? 3000 }),
        info: (message: string, duration?: number) =>
          addToast({ message, type: 'info', duration: duration ?? 3000 }),
      };
    }
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(({ id, props }) => (
          <Toast key={id} {...props} onClose={() => removeToast(id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
