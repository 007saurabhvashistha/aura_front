import type { ReactNode } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface ModuleAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

interface ModuleBlock {
  title: string;
  description: string;
  points: string[];
}

interface AdminModulePageProps {
  title: string;
  subtitle: string;
  actions?: ModuleAction[];
  blocks: ModuleBlock[];
  banner?: ReactNode;
}

export function AdminModulePage({
  title,
  subtitle,
  actions = [],
  blocks,
  banner,
}: AdminModulePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-admin-text-primary mb-2">{title}</h1>
          <p className="text-secondary">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant ?? 'secondary'}>
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {banner}

      <div className="grid grid-cols-2 gap-6">
        {blocks.map((block) => (
          <Card key={block.title} title={block.title} description={block.description} variant="elevated">
            <div className="space-y-2">
              {block.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600" />
                  <p className="text-sm text-secondary">{point}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
