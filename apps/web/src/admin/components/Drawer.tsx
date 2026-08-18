import React from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: DrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-drawer-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose}>
            <span aria-hidden>✕</span>
          </button>
        </header>

        <div className="admin-drawer-body">{children}</div>

        {footer && <footer className="admin-drawer-footer">{footer}</footer>}
      </aside>
    </div>
  );
}
