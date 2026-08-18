import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="admin-empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="admin-empty-state-action">{action}</div>}
    </div>
  );
}
