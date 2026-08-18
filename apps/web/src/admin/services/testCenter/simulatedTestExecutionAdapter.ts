import { getKnowledgeReadiness, knowledgeReadinessReason } from '../../hooks/useKnowledgeRegistry';
import { getToolReadiness, toolReadinessReason } from '../../hooks/useToolRegistry';
import type { IntegrationCapability, IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type {
  TestExecutionContext,
  TestExecutionService,
  TestRunRequest,
  TestRunResult,
  TestTraceStep,
  TestType,
} from './TestExecutionService';

const CAPABILITY_LABELS: Record<IntegrationCapability, string> = {
  intelligence: 'Intelligence (LLM)',
  voice: 'Voice',
  realtime: 'Realtime',
  calling: 'Telephony',
};

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

// Deterministic pseudo-latency so repeated runs stay stable and comparable.
function latencyFor(seed: string, base: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return base + (hash % 220);
}

function needsKnowledge(type: TestType): boolean {
  return type === 'knowledge' || type === 'conversation' || type === 'end_to_end';
}

function needsTools(type: TestType): boolean {
  return type === 'tool' || type === 'end_to_end';
}

function requiredCapabilities(type: TestType): IntegrationCapability[] {
  switch (type) {
    case 'conversation':
      return ['intelligence'];
    case 'voice':
      return ['voice', 'realtime'];
    case 'integration':
    case 'end_to_end':
      return ['intelligence', 'voice', 'realtime'];
    default:
      return [];
  }
}

export class SimulatedTestExecutionAdapter implements TestExecutionService {
  readonly mode = 'SIMULATED' as const;

  execute(request: TestRunRequest, context: TestExecutionContext): TestRunResult {
    const agent = context.agents.find((item) => item.id === request.agentId) ?? null;
    const trace: TestTraceStep[] = [];
    const errors: string[] = [];

    const push = (step: TestTraceStep): void => {
      trace.push(step);
      if (step.error) errors.push(step.error);
    };

    push({
      id: 'step-input',
      stage: 'input',
      label: 'Input received',
      detail: request.input || '(no input provided)',
      status: 'passed',
      latencyMs: 4,
    });

    if (!agent) {
      push({
        id: 'step-agent',
        stage: 'agent',
        label: 'Agent resolution',
        detail: 'Agent could not be resolved from the registry.',
        status: 'failed',
        latencyMs: 2,
        error: 'Selected agent no longer exists.',
      });
      return this.finish(request, 'Unknown agent', trace, errors);
    }

    push({
      id: 'step-agent',
      stage: 'agent',
      label: `Agent ${agent.name}`,
      detail: `Status ${agent.status} · version ${request.versionLabel}`,
      status: agent.status === 'archived' ? 'failed' : 'passed',
      latencyMs: latencyFor(agent.id, 40),
      resourceType: 'agent',
      resourceId: agent.id,
      href: `/admin/agents/${agent.id}`,
      error: agent.status === 'archived' ? 'Archived agents cannot serve traffic.' : undefined,
    });

    if (needsKnowledge(request.testType)) {
      const assigned = context.knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agent.id));
      if (assigned.length === 0) {
        push({
          id: 'step-knowledge-none',
          stage: 'knowledge',
          label: 'Knowledge retrieval',
          detail: 'No knowledge base assigned to this agent.',
          status: request.testType === 'knowledge' ? 'failed' : 'skipped',
          latencyMs: 3,
          error: request.testType === 'knowledge' ? 'No knowledge base assigned.' : undefined,
        });
      } else {
        assigned.forEach((kb) => {
          const readiness = getKnowledgeReadiness(kb);
          const ok = readiness === 'READY';
          push({
            id: `step-knowledge-${kb.id}`,
            stage: 'knowledge',
            label: `Knowledge ${kb.name}`,
            detail: ok
              ? `Retrieved from ${kb.sources.filter((s) => s.status === 'indexed').length} indexed source(s).`
              : knowledgeReadinessReason(readiness),
            status: ok ? 'passed' : 'failed',
            latencyMs: latencyFor(kb.id, 90),
            resourceType: 'knowledge',
            resourceId: kb.id,
            href: `/admin/knowledge/${kb.id}`,
            error: ok ? undefined : `Knowledge base "${kb.name}" is not ready.`,
          });
        });
      }
    }

    if (needsTools(request.testType)) {
      const assigned = context.tools.filter((tool) => tool.assignedAgentIds.includes(agent.id));
      if (assigned.length === 0) {
        push({
          id: 'step-tool-none',
          stage: 'tool',
          label: 'Tool execution',
          detail: 'No tool assigned to this agent.',
          status: request.testType === 'tool' ? 'failed' : 'skipped',
          latencyMs: 3,
          error: request.testType === 'tool' ? 'No tool assigned.' : undefined,
        });
      } else {
        assigned.forEach((tool) => {
          const readiness = getToolReadiness(tool);
          const ok = readiness === 'READY';
          push({
            id: `step-tool-${tool.id}`,
            stage: 'tool',
            label: `Tool ${tool.name}`,
            detail: ok ? `Invoked with declared input schema.` : toolReadinessReason(readiness),
            status: ok ? 'passed' : 'failed',
            latencyMs: latencyFor(tool.id, 120),
            resourceType: 'tool',
            resourceId: tool.id,
            href: `/admin/tools/${tool.id}`,
            error: ok ? undefined : `Tool "${tool.name}" is not ready.`,
          });
        });
      }
    }

    const capabilities = requiredCapabilities(request.testType);
    if (capabilities.length > 0) {
      const binding = context.integrationBindings.find((item) => item.id === agent.id);
      capabilities.forEach((capability) => {
        const refId =
          capability === 'intelligence'
            ? binding?.integrationRefs.intelligenceIntegrationId
            : capability === 'voice'
              ? binding?.integrationRefs.voiceIntegrationId
              : capability === 'realtime'
                ? binding?.integrationRefs.realtimeIntegrationId
                : binding?.integrationRefs.callingIntegrationId;

        const integration: IntegrationRecord | undefined = refId
          ? context.integrations.find((item) => item.id === refId)
          : undefined;

        if (!integration) {
          push({
            id: `step-integration-${capability}`,
            stage: 'integration',
            label: `${CAPABILITY_LABELS[capability]} integration`,
            detail: 'No integration assigned for this capability.',
            status: 'failed',
            latencyMs: 3,
            error: `${CAPABILITY_LABELS[capability]} integration is not assigned.`,
          });
          return;
        }

        const ok = integration.enabled && integration.status === 'connected';
        push({
          id: `step-integration-${capability}`,
          stage: 'integration',
          label: `${CAPABILITY_LABELS[capability]} · ${integration.config.provider || integration.name}`,
          detail: ok ? 'Connection healthy.' : `Integration status is ${integration.status.replace('_', ' ')}.`,
          status: ok ? 'passed' : 'failed',
          latencyMs: latencyFor(integration.id, 70),
          resourceType: 'integration',
          resourceId: integration.id,
          href: '/admin/integrations',
          error: ok ? undefined : `${integration.name} is not connected.`,
        });
      });
    }

    const failed = trace.some((step) => step.status === 'failed');
    push({
      id: 'step-output',
      stage: 'output',
      label: 'Response generated',
      detail: failed
        ? 'No response produced because an upstream dependency failed.'
        : this.buildOutput(request, agent.name),
      status: failed ? 'failed' : 'passed',
      latencyMs: failed ? 0 : latencyFor(request.input || agent.id, 60),
    });

    return this.finish(request, agent.name, trace, errors);
  }

  private buildOutput(request: TestRunRequest, agentName: string): string {
    switch (request.testType) {
      case 'voice':
        return `${agentName} voice pipeline is reachable and stream-ready.`;
      case 'tool':
        return `${agentName} executed all assigned tools against their declared schemas.`;
      case 'knowledge':
        return `${agentName} retrieved grounded context for: "${request.input}".`;
      case 'integration':
        return `${agentName} reached every required provider.`;
      case 'end_to_end':
        return `${agentName} completed the full flow for: "${request.input}".`;
      case 'conversation':
      default:
        return `${agentName}: simulated reply to "${request.input}".`;
    }
  }

  private finish(
    request: TestRunRequest,
    agentName: string,
    trace: TestTraceStep[],
    errors: string[],
  ): TestRunResult {
    const failed = trace.some((step) => step.status === 'failed');
    return {
      id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      request,
      agentName,
      mode: this.mode,
      status: failed ? 'failed' : 'passed',
      startedAt: nowStamp(),
      totalLatencyMs: trace.reduce((sum, step) => sum + step.latencyMs, 0),
      output: trace[trace.length - 1]?.detail ?? '',
      errors,
      trace,
    };
  }
}

export const simulatedTestExecutionService: TestExecutionService = new SimulatedTestExecutionAdapter();
