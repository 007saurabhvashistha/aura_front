import { getKnowledgeReadiness, knowledgeReadinessReason } from '../../hooks/useKnowledgeRegistry';
import { getToolReadiness, toolReadinessReason } from '../../hooks/useToolRegistry';
import type { IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import { simulatedLlmGateway, type CompanionTurnContext } from '../companion';
import type {
  AiTurnResult,
  CallAdvanceOptions,
  CallAdvanceResult,
  CallStatus,
  InteractionTraceStep,
  SocialInteractionContext,
  SocialInteractionService,
} from './SocialInteractionService';

function latencyFor(seed: string, base: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return base + (hash % 180);
}

function finish(trace: InteractionTraceStep[], output: string): AiTurnResult {
  const errors = trace.map((step) => step.error).filter((error): error is string => Boolean(error));
  const failed = trace.some((step) => step.status === 'failed');
  return {
    status: failed ? 'failed' : 'passed',
    output: failed ? 'No reply produced because an upstream dependency failed.' : output,
    totalLatencyMs: trace.reduce((sum, step) => sum + step.latencyMs, 0),
    errors,
    trace,
  };
}

function realtimeIntegration(context: SocialInteractionContext): IntegrationRecord | null {
  return context.integrations.find((integration) => integration.capability === 'realtime') ?? null;
}

export class SimulatedSocialInteractionAdapter implements SocialInteractionService {
  readonly mode = 'SIMULATED' as const;

  generateAiTurn(
    input: string,
    agentId: string | null,
    context: SocialInteractionContext,
    turnContext?: CompanionTurnContext | null,
  ): AiTurnResult {
    const trace: InteractionTraceStep[] = [
      {
        id: 'social-step-input',
        stage: 'input',
        label: 'Message received',
        detail: input || '(empty message)',
        status: 'passed',
        latencyMs: 4,
      },
    ];

    const agent = agentId ? context.agents.find((item) => item.id === agentId) ?? null : null;

    if (!agent) {
      trace.push({
        id: 'social-step-agent',
        stage: 'agent',
        label: 'Agent resolution',
        detail: 'This AI companion is not backed by a published agent.',
        status: 'failed',
        latencyMs: 2,
        error: 'AI companion has no linked agent.',
      });
      return finish(trace, '');
    }

    const agentUsable = agent.status !== 'archived' && agent.status !== 'disabled';
    trace.push({
      id: 'social-step-agent',
      stage: 'agent',
      label: `Agent ${agent.name}`,
      detail: `Status ${agent.status} · environment ${agent.environment}`,
      status: agentUsable ? 'passed' : 'failed',
      latencyMs: latencyFor(agent.id, 40),
      resourceType: 'agent',
      resourceId: agent.id,
      href: `/admin/agents/${agent.id}`,
      error: agentUsable ? undefined : `Agent is ${agent.status} and cannot serve conversations.`,
    });

    const knowledge = context.knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agent.id));
    if (knowledge.length === 0) {
      trace.push({
        id: 'social-step-knowledge-none',
        stage: 'knowledge',
        label: 'Knowledge retrieval',
        detail: 'No knowledge base assigned. Replying from the companion persona only.',
        status: 'skipped',
        latencyMs: 3,
      });
    } else {
      knowledge.forEach((kb) => {
        const readiness = getKnowledgeReadiness(kb);
        const ok = readiness === 'READY';
        trace.push({
          id: `social-step-knowledge-${kb.id}`,
          stage: 'knowledge',
          label: `Knowledge ${kb.name}`,
          detail: ok
            ? `Grounded on ${kb.sources.filter((source) => source.status === 'indexed').length} indexed source(s).`
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

    const tools = context.tools.filter((tool) => tool.assignedAgentIds.includes(agent.id));
    tools.forEach((tool) => {
      const readiness = getToolReadiness(tool);
      const ok = readiness === 'READY';
      trace.push({
        id: `social-step-tool-${tool.id}`,
        stage: 'tool',
        label: `Tool ${tool.name}`,
        detail: ok ? 'Available for this turn.' : toolReadinessReason(readiness),
        status: ok ? 'passed' : 'failed',
        latencyMs: latencyFor(tool.id, 110),
        resourceType: 'tool',
        resourceId: tool.id,
        href: `/admin/tools/${tool.id}`,
        error: ok ? undefined : `Tool "${tool.name}" is not ready.`,
      });
    });

    const binding = context.integrationBindings.find((item) => item.id === agent.id);
    const llmId = binding?.integrationRefs.intelligenceIntegrationId ?? null;
    const llm = llmId ? context.integrations.find((item) => item.id === llmId) ?? null : null;

    if (!llm) {
      trace.push({
        id: 'social-step-integration-intelligence',
        stage: 'integration',
        label: 'LLM Gateway contract',
        detail: 'No production intelligence provider is assigned. Using the simulated LLM Gateway contract for this phase.',
        status: 'skipped',
        latencyMs: 3,
        href: '/admin/integrations',
      });
    } else {
      const ok = llm.enabled && llm.status === 'connected';
      trace.push({
        id: 'social-step-integration-intelligence',
        stage: 'integration',
        label: `Intelligence · ${llm.config.provider || llm.name}`,
        detail: ok
          ? 'Connection healthy; routed through the LLM Gateway contract.'
          : `Integration status is ${llm.status.replace('_', ' ')}. Using the simulated LLM Gateway contract.`,
        status: ok ? 'passed' : 'skipped',
        latencyMs: latencyFor(llm.id, 70),
        resourceType: 'integration',
        resourceId: llm.id,
        href: '/admin/integrations',
      });
    }

    const failed = trace.some((step) => step.status === 'failed');
    const gateway = !failed && turnContext?.persona
      ? simulatedLlmGateway.generate({
          companionId: turnContext.companion.id,
          agentId: agent.id,
          userMessage: input,
          persona: turnContext.persona,
          relationship: turnContext.relationship,
          memories: turnContext.memories,
          conversationContext: context,
        })
      : null;

    trace.push({
      id: 'social-step-output',
      stage: 'output',
      label: 'Reply generated',
      detail: failed
        ? 'No reply produced because an upstream dependency failed.'
        : gateway
          ? 'Reply produced by the simulated LLM Gateway contract.'
          : `${agent.name}: simulated reply through the base interaction adapter.`,
      status: failed ? 'failed' : 'passed',
      latencyMs: failed ? 0 : latencyFor(input || agent.id, 60),
    });

    return finish([...trace, ...(gateway?.trace ?? [])], gateway?.text ?? 'Got it, tell me more.');
  }

  generatePersonTurn(input: string, participantName: string): AiTurnResult {
    const trace: InteractionTraceStep[] = [
      {
        id: 'social-step-input',
        stage: 'input',
        label: 'Message sent',
        detail: input || '(empty message)',
        status: 'passed',
        latencyMs: 4,
      },
      {
        id: 'social-step-transport',
        stage: 'transport',
        label: 'Message delivery',
        detail: `Delivered to ${participantName}. No AI model or LLM Gateway is involved in this conversation.`,
        status: 'passed',
        latencyMs: latencyFor(participantName, 30),
      },
      {
        id: 'social-step-output',
        stage: 'output',
        label: 'Reply state',
        detail: `${participantName} is a real person; Aura only handles message transport here.`,
        status: 'passed',
        latencyMs: latencyFor(input || participantName, 80),
      },
    ];

    return finish(trace, 'Message delivered. Waiting on their reply.');
  }

  advanceCall(
    current: CallStatus,
    context: SocialInteractionContext,
    options?: CallAdvanceOptions,
  ): CallAdvanceResult {
    const realtime = realtimeIntegration(context);
    const transportOk = Boolean(realtime && realtime.enabled && realtime.status === 'connected');
    const demoFallback = !transportOk && Boolean(options?.forceDemoTransport);
    const transportName = realtime?.name ?? 'Realtime provider';

    const transportStep = (status: 'passed' | 'failed'): InteractionTraceStep => ({
      id: `call-transport-${Date.now().toString(36)}`,
      stage: 'transport',
      label: demoFallback
        ? `Realtime transport · DEMO (${transportName} unavailable)`
        : `Realtime transport · ${transportName}`,
      detail: transportOk
        ? 'Media session negotiated.'
        : demoFallback
          ? `${transportName} is not connected. Call connected over a simulated demo transport; no real media is exchanged.`
          : `${transportName} status is ${realtime ? realtime.status.replace('_', ' ') : 'not configured'}.`,
      status,
      latencyMs: latencyFor(transportName, 120),
      resourceType: 'integration',
      resourceId: realtime?.id,
      href: '/admin/integrations',
      error: status === 'failed' ? `${transportName} is not connected, so media cannot be established.` : undefined,
    });

    switch (current) {
      case 'requested':
        return { status: 'ringing', note: 'Ringing the other participant.', trace: [] };
      case 'ringing':
        return { status: 'connecting', note: 'Participant accepted. Negotiating media.', trace: [] };
      case 'connecting':
        if (transportOk) {
          return { status: 'active', note: 'Media connected. Call is live.', trace: [transportStep('passed')] };
        }
        if (demoFallback) {
          return {
            status: 'active',
            note: `Call connected in DEMO mode (${transportName} unavailable).`,
            trace: [transportStep('passed')],
          };
        }
        return {
          status: 'failed',
          note: `Call failed: ${transportName} is not connected.`,
          trace: [transportStep('failed')],
        };
      case 'active':
        return { status: 'ended', note: 'Call ended by operator.', trace: [] };
      default:
        return { status: current, note: 'Call already reached a terminal state.', trace: [] };
    }
  }
}

export const simulatedSocialInteractionService: SocialInteractionService = new SimulatedSocialInteractionAdapter();
