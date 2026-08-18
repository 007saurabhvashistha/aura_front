import type { ReactNode } from 'react';
import { Badge } from './Badge';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal';

interface ResourceCardProps {
  title: string;
  subtitle?: string;
  status?: { label: string; variant: BadgeVariant };
  meta?: { label: string; value: string }[];
  footer?: ReactNode;
  onClick?: () => void;
}

// Generic resource summary card used for knowledge bases, tools, and other
// control-plane resources so cards look and behave consistently.
export function ResourceCard({ title, subtitle, status, meta = [], footer, onClick }: ResourceCardProps) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      className={`admin-resource-card ${interactive ? 'is-interactive' : ''}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="admin-resource-card-head">
        <div className="admin-resource-card-title">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>

      {meta.length > 0 && (
        <dl className="admin-resource-card-meta">
          {meta.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {footer && <div className="admin-resource-card-footer">{footer}</div>}
    </div>
  );
}
