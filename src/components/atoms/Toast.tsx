'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

interface ToastItem {
  id: string;
  props: Omit<ToastProps, 'onClose'>;
  timer?: NodeJS.Timeout;
}

let toastId = 0;

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [_id] = useState(() => `toast-${++toastId}`);
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
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/30';
      case 'error':
        return 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/30';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/30';
      case 'info':
        return 'bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/30';
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800/30';
    }
  };

  return (
    <>
      {isVisible && (
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border shadow-xl max-w-md backdrop-blur-sm transition-all duration-300 animate-in',
            getColors()
          )}
        >
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="flex-1 text-sm font-medium leading-relaxed">{message}</div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1 transition-all hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

// Toast container for managing multiple toasts
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const _toastIdRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.timer) {
        clearTimeout(toast.timer);
      }
      return prev.filter((toast) => toast.id !== id);
    });
  }, []);

  const addToast = useCallback((props: Omit<ToastProps, 'onClose'>) => {
    const id = `toast-${_toastIdRef.current++}`;
    const newToast = { id, props };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = props.duration ?? 3000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => {
          const toast = prev.find((t) => t.id === id);
          if (toast?.timer) {
            clearTimeout(toast.timer);
          }
          return prev.filter((toast) => toast.id !== id);
        });
      }, duration + 300); // Add animation time

      // Store timer reference for cleanup
      setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, timer } : toast)));
    }
  }, []);

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
      (
        window as Window & {
          toast?: {
            success: (message: string, duration?: number) => void;
            error: (message: string, duration?: number) => void;
            warning: (message: string, duration?: number) => void;
            info: (message: string, duration?: number) => void;
          };
        }
      ).toast = {
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
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(({ id, props }) => (
        <Toast key={id} {...props} onClose={() => removeToast(id)} />
      ))}
    </div>
  );
}
