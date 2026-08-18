import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function ErrorState({ title = 'Something went wrong', description, action }: ErrorStateProps) {
  return (
    <div className="admin-error-state" role="alert">
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="admin-error-state-action">{action}</div>}
    </div>
  );
}
