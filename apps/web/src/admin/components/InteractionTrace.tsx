import { Link } from 'react-router-dom';
import { Badge } from './Badge';
import type { InteractionStepStatus, InteractionTraceStep } from '../services/social';

function statusVariant(status: InteractionStepStatus): 'success' | 'danger' | 'default' {
  if (status === 'passed') return 'success';
  if (status === 'failed') return 'danger';
  return 'default';
}

// Interaction trace: Input -> Agent -> Knowledge/Tool/Integration/Transport -> Output.
// Mirrors the Test Center trace so operators read one mental model everywhere.
export function InteractionTrace({ steps }: { steps: InteractionTraceStep[] }) {
  return (
    <div className="tc-trace">
      {steps.map((step) => (
        <div key={step.id} className={`tc-trace-step is-${step.status}`}>
          <div className="tc-trace-head">
            <span className="tc-trace-stage">{step.stage}</span>
            <p className="admin-cell-title">{step.label}</p>
            <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
            <span className="tc-trace-latency">{step.latencyMs} ms</span>
          </div>
          <p className="admin-cell-sub">{step.detail}</p>
          {step.error && <p className="tc-trace-error">{step.error}</p>}
          {step.href && (
            <Link to={step.href} className="tc-trace-link">
              Open {step.resourceType ?? 'resource'} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
