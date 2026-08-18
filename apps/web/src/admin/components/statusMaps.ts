import type { ProcessingStatus, KnowledgeReadiness, SourceStatus } from '../hooks/useKnowledgeRegistry';
import type { ToolReadiness, ToolTestState, ToolValidationState } from '../hooks/useToolRegistry';
import type { AgentLifecycleStatus } from '../data/demoAgents';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal';

export interface StatusDescriptor {
  label: string;
  variant: BadgeVariant;
}

export function knowledgeReadinessBadge(readiness: KnowledgeReadiness): StatusDescriptor {
  switch (readiness) {
    case 'READY':
      return { label: 'Ready', variant: 'success' };
    case 'INDEXING':
      return { label: 'Indexing', variant: 'info' };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger' };
    case 'DISABLED':
      return { label: 'Disabled', variant: 'warning' };
    case 'EMPTY':
    default:
      return { label: 'Empty', variant: 'default' };
  }
}

export function sourceStatusBadge(status: SourceStatus): StatusDescriptor {
  switch (status) {
    case 'indexed':
      return { label: 'Indexed', variant: 'success' };
    case 'processing':
      return { label: 'Processing', variant: 'info' };
    case 'failed':
      return { label: 'Failed', variant: 'danger' };
    case 'disabled':
      return { label: 'Disabled', variant: 'warning' };
    case 'pending':
    default:
      return { label: 'Pending', variant: 'default' };
  }
}

export function processingStatusBadge(status: ProcessingStatus): StatusDescriptor {
  switch (status) {
    case 'indexed':
      return { label: 'Indexed', variant: 'success' };
    case 'processing':
      return { label: 'Processing', variant: 'info' };
    case 'failed':
      return { label: 'Failed', variant: 'danger' };
    case 'pending':
    default:
      return { label: 'Pending', variant: 'warning' };
  }
}

export function toolValidationBadge(state: ToolValidationState): StatusDescriptor {
  switch (state) {
    case 'validated':
      return { label: 'Validated', variant: 'success' };
    case 'configured':
      return { label: 'Configured', variant: 'info' };
    case 'error':
      return { label: 'Error', variant: 'danger' };
    case 'unconfigured':
    default:
      return { label: 'Unconfigured', variant: 'warning' };
  }
}

export function toolTestBadge(state: ToolTestState): StatusDescriptor {
  switch (state) {
    case 'passed':
      return { label: 'Test passed', variant: 'success' };
    case 'failed':
      return { label: 'Test failed', variant: 'danger' };
    case 'untested':
    default:
      return { label: 'Untested', variant: 'default' };
  }
}

export function toolReadinessBadge(readiness: ToolReadiness): StatusDescriptor {
  switch (readiness) {
    case 'READY':
      return { label: 'Ready', variant: 'success' };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger' };
    case 'DISABLED':
      return { label: 'Disabled', variant: 'warning' };
    case 'UNVALIDATED':
    default:
      return { label: 'Not ready', variant: 'default' };
  }
}

export function agentStatusBadge(status: AgentLifecycleStatus): StatusDescriptor {
  switch (status) {
    case 'published':
      return { label: 'Published', variant: 'success' };
    case 'disabled':
      return { label: 'Disabled', variant: 'warning' };
    case 'draft':
    default:
      return { label: 'Draft', variant: 'default' };
  }
}
