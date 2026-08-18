import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface RowMenuProps {
  items: MenuItem[];
  label?: string;
}

// Compact kebab action menu for dense resource tables.
export function RowMenu({ items, label = 'Actions' }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="admin-row-menu" ref={ref}>
      <button
        type="button"
        className="admin-icon-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className="admin-row-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`admin-row-menu-item ${item.destructive ? 'is-destructive' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MenuProviderProps {
  children: ReactNode;
}

export function MenuBar({ children }: MenuProviderProps) {
  return <div className="admin-row-actions">{children}</div>;
}
