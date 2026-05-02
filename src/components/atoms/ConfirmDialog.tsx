'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-rose-600 dark:text-rose-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'info':
        return 'text-sky-600 dark:text-sky-400';
      default:
        return 'text-rose-600 dark:text-rose-400';
    }
  };

  const getConfirmVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive' as const;
      case 'warning':
        return 'outline' as const;
      case 'info':
        return 'default' as const;
      default:
        return 'destructive' as const;
    }
  };

  return (
    <>
      {isOpen && (
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 ${getIconColor()}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
                  <div className="flex space-x-3 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                      {cancelText}
                    </Button>
                    <Button
                      variant={getConfirmVariant()}
                      onClick={handleConfirm}
                      disabled={isLoading}
                      data-testid="confirm-delete-button"
                    >
                      {isLoading ? 'Confirming...' : confirmText}
                    </Button>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
