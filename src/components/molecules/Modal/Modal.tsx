'use client';

import React, { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'react-focus-trap';
import { Button } from '@/components/atoms/Button/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  preventClose?: boolean;
  initialFocus?: React.MutableRefObject<HTMLElement | null>;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  preventClose = false,
  initialFocus,
  footer,
}: ModalProps) {
  const handleClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? handleClose : () => {}}
        initialFocus={initialFocus}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white dark:bg-secondary-900 p-6 text-left align-middle shadow-2xl transition-all`}
              >
                <FocusTrap focusTrapOptions={{ 
                  allowOutsideClick: true,
                  initialFocus: initialFocus?.current || undefined,
                }}>
                  <div>
                    {title && (
                      <div className="flex items-center justify-between mb-4">
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-secondary-900 dark:text-secondary-100"
                        >
                          {title}
                        </Dialog.Title>
                        {showCloseButton && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="-mr-2"
                            aria-label="Close modal"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {description && (
                      <Dialog.Description className="mb-6 text-sm text-secondary-500 dark:text-secondary-400">
                        {description}
                      </Dialog.Description>
                    )}

                    <div className={title || description ? 'mt-4' : ''}>
                      {children}
                    </div>

                    {footer && (
                      <div className="mt-6 flex justify-end space-x-3">
                        {footer}
                      </div>
                    )}
                  </div>
                </FocusTrap>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Confirmation Modal Variant
interface ConfirmationModalProps extends Omit<ModalProps, 'children'> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success' | 'warning';
  isLoading?: boolean;
  icon?: ReactNode;
}

export function ConfirmationModal({
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  icon,
  children,
  ...props
}: ConfirmationModalProps) {
  return (
    <Modal
      {...props}
      footer={
        <div className="flex w-full justify-end space-x-3">
          <Button
            variant="outline"
            onClick={props.onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start space-x-4">
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Modal>
  );
}