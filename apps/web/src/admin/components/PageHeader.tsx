import { Link } from 'react-router-dom';

interface HeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: HeaderAction[];
}

function ActionButton({ action }: { action: HeaderAction }) {
  const variantClass =
    action.variant === 'secondary'
      ? 'btn btn-secondary'
      : action.variant === 'ghost'
        ? 'btn btn-ghost'
        : 'btn btn-primary';

  if (action.href) {
    return (
      <Link to={action.href} className={variantClass}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={variantClass} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions = [],
}: PageHeaderProps) {
  return (
    <section className="admin-page-header">
      <div className="admin-page-header-main">
        {breadcrumbs.length > 0 && (
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (item.href && !isLast) {
                return (
                  <span key={`${item.label}-${index}`}>
                    <Link to={item.href}>{item.label}</Link>
                    <span className="admin-breadcrumb-sep">/</span>
                  </span>
                );
              }

              return (
                <span key={`${item.label}-${index}`} className={isLast ? 'is-current' : ''}>
                  {item.label}
                  {!isLast && <span className="admin-breadcrumb-sep">/</span>}
                </span>
              );
            })}
          </nav>
        )}

        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="admin-page-actions">
          {actions.map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
