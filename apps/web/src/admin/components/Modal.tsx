import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-2xl',
    lg: 'w-full max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className={`max-h-[90vh] overflow-hidden rounded-xl border border-admin-border bg-admin-bg-primary shadow-xl ${sizeStyles[size]}`}>
        <div className="border-b border-admin-border px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-admin-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-admin-text-secondary hover:text-admin-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(90vh-8.5rem)] overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && <div className="border-t border-admin-border px-4 py-3 sm:px-6 sm:py-4 flex justify-end gap-2 bg-admin-bg-secondary">{footer}</div>}
      </div>
    </div>
  );
}
