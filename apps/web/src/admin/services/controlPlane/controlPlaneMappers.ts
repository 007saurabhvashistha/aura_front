import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { AgentBinding, IntegrationCapability, IntegrationRecord, IntegrationStatus } from '../../hooks/useIntegrationRegistry';
import { getKnowledgeReadiness, type KnowledgeBase, type KnowledgeReadiness } from '../../hooks/useKnowledgeRegistry';
import type { Tool } from '../../hooks/useToolRegistry';
import type { CallSession, Conversation } from '../../hooks/useConversationRegistry';
import { demoActivityService } from '../activity';
import type { TestRunResult } from '../testCenter';
import type {
  AgentActivitySummaryRow,
  AttentionItem,
  AttentionSeverity,
  DistributionSegment,
  IntegrationHealthRow,
  RecentActivityItem,
} from './ControlPlaneOverviewService';

function asNumberMap<T extends string>(keys: T[]): Record<T, number> {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<T, number>);
}

function capabilityLabel(capability: IntegrationCapability): string {
  switch (capability) {
    case 'intelligence':
      return 'Intelligence';
    case 'voice':
      return 'Voice';
    case 'realtime':
      return 'Realtime';
    case 'calling':
      return 'Telephony';
    default:
      return capability;
  }
}

function statusLabel(status: IntegrationStatus): string {
  return status.replace('_', ' ');
}

function parseStamp(stamp: string | undefined): number {
  if (!stamp) return 0;
  const normalized = stamp.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pushAttention(
  target: AttentionItem[],
  severity: AttentionSeverity,
  payload: Omit<AttentionItem, 'id' | 'severity'>,
): void {
  target.push({
    id: `${payload.resourceType}-${payload.resourceName}-${severity}-${payload.reason}`,
    severity,
    ...payload,
  });
}

export function deriveAgentStatusSegments(agents: ControlPlaneAgent[]): DistributionSegment[] {
  const statusCounts = asNumberMap(['published', 'draft', 'disabled', 'archived', 'error'] as const);
  agents.forEach((agent) => {
    statusCounts[agent.status] += 1;
  });

  return [
    { key: 'published', label: 'Published', count: statusCounts.published },
    { key: 'draft', label: 'Draft', count: statusCounts.draft },
    { key: 'disabled', label: 'Disabled', count: statusCounts.disabled },
    { key: 'archived', label: 'Archived', count: statusCounts.archived },
    { key: 'error', label: 'Error', count: statusCounts.error },
  ];
}

export function deriveIntegrationStatusSegments(integrations: IntegrationRecord[]): DistributionSegment[] {
  const statusCounts = asNumberMap([
    'connected',
    'testing',
    'failed',
    'disabled',
    'not_configured',
    'configured',
    'validation_error',
    'empty',
  ] as const);

  integrations.forEach((integration) => {
    statusCounts[integration.status] += 1;
  });

  return [
    { key: 'connected', label: 'Connected', count: statusCounts.connected },
    { key: 'testing', label: 'Testing', count: statusCounts.testing },
    { key: 'failed', label: 'Failed', count: statusCounts.failed + statusCounts.validation_error },
    { key: 'disabled', label: 'Disabled', count: statusCounts.disabled },
    {
      key: 'not_configured',
      label: 'Not configured',
      count: statusCounts.not_configured + statusCounts.configured + statusCounts.empty,
    },
  ];
}

export function deriveKnowledgeStatusSegments(knowledgeBases: KnowledgeBase[]): DistributionSegment[] {
  const readinessCounts = asNumberMap(['READY', 'INDEXING', 'EMPTY', 'FAILED', 'DISABLED'] as const);
  knowledgeBases.forEach((kb) => {
    const readiness = getKnowledgeReadiness(kb);
    readinessCounts[readiness] += 1;
  });

  return [
    { key: 'READY', label: 'Ready', count: readinessCounts.READY },
    { key: 'INDEXING', label: 'Indexing', count: readinessCounts.INDEXING },
    { key: 'EMPTY', label: 'Empty', count: readinessCounts.EMPTY },
    { key: 'FAILED', label: 'Error', count: readinessCounts.FAILED },
    { key: 'DISABLED', label: 'Disabled', count: readinessCounts.DISABLED },
  ];
}

export function deriveToolStatusSegments(tools: Tool[]): DistributionSegment[] {
  const enabled = tools.filter((tool) => tool.enabled).length;
  const disabled = tools.length - enabled;
  const valid = tools.filter((tool) => tool.validationState === 'validated').length;
  const failed = tools.filter((tool) => tool.validationState === 'error' || tool.testState === 'failed').length;

  return [
    { key: 'enabled', label: 'Enabled', count: enabled },
    { key: 'disabled', label: 'Disabled', count: disabled },
    { key: 'valid', label: 'Valid', count: valid },
    { key: 'failed', label: 'Failed', count: failed },
  ];
}

export function deriveAttentionItems(
  agents: ControlPlaneAgent[],
  bindings: AgentBinding[],
  integrations: IntegrationRecord[],
  knowledgeBases: KnowledgeBase[],
  tools: Tool[],
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const integrationById = new Map(integrations.map((integration) => [integration.id, integration]));
  const bindingByAgentId = new Map(bindings.map((binding) => [binding.id, binding]));

  integrations.forEach((integration) => {
    if (integration.status === 'failed' || integration.status === 'validation_error') {
      pushAttention(items, 'critical', {
        resourceType: 'integration',
        resourceName: integration.name,
        reason: `Connection status is ${statusLabel(integration.status)}.`,
        href: '/admin/integrations',
        ctaLabel: 'Configure Integration',
        timestamp: integration.lastTested !== 'Never' ? integration.lastTested : undefined,
      });
    }

    if (integration.status === 'disabled' && integration.usedByAgents.length > 0) {
      pushAttention(items, 'warning', {
        resourceType: 'integration',
        resourceName: integration.name,
        reason: `Disabled but still assigned to ${integration.usedByAgents.length} agent(s).`,
        href: '/admin/integrations',
        ctaLabel: 'Review Integration',
        timestamp: integration.lastTested !== 'Never' ? integration.lastTested : undefined,
      });
    }
  });

  tools.forEach((tool) => {
    if (tool.validationState === 'error' || tool.testState === 'failed') {
      pushAttention(items, 'critical', {
        resourceType: 'tool',
        resourceName: tool.name,
        reason:
          tool.validationState === 'error'
            ? 'Tool configuration failed validation.'
            : 'Latest tool test failed.',
        href: '/admin/tools',
        ctaLabel: 'Open Tool',
        timestamp: tool.updatedAt,
      });
    }
  });

  knowledgeBases.forEach((kb) => {
    const readiness = getKnowledgeReadiness(kb);
    if (readiness === 'INDEXING') {
      pushAttention(items, 'warning', {
        resourceType: 'knowledge',
        resourceName: kb.name,
        reason: 'Indexing is in progress.',
        href: `/admin/knowledge/${kb.id}/processing`,
        ctaLabel: 'Review Knowledge',
        timestamp: kb.updatedAt,
      });
    }
    if (readiness === 'FAILED') {
      pushAttention(items, 'critical', {
        resourceType: 'knowledge',
        resourceName: kb.name,
        reason: 'Knowledge indexing failed and needs retry.',
        href: `/admin/knowledge/${kb.id}/processing`,
        ctaLabel: 'Review Knowledge',
        timestamp: kb.updatedAt,
      });
    }
  });

  agents.forEach((agent) => {
    if (agent.status === 'draft') {
      pushAttention(items, 'warning', {
        resourceType: 'agent',
        resourceName: agent.name,
        reason: 'Draft agent is waiting for publish.',
        href: `/admin/agents/${agent.id}`,
        ctaLabel: 'Open Agent',
        timestamp: agent.updatedAt,
      });
    }

    if (agent.status === 'published') {
      const binding = bindingByAgentId.get(agent.id);
      const requiredRefs = [
        binding?.integrationRefs.intelligenceIntegrationId,
        binding?.integrationRefs.voiceIntegrationId,
        binding?.integrationRefs.realtimeIntegrationId,
      ];
      const missingRef = requiredRefs.some((ref) => !ref);
      const hasDisconnected = requiredRefs
        .filter((ref): ref is NonNullable<typeof ref> => Boolean(ref))
        .some((ref) => integrationById.get(ref)?.status !== 'connected');

      if (missingRef || hasDisconnected) {
        pushAttention(items, 'critical', {
          resourceType: 'agent',
          resourceName: agent.name,
          reason: 'Published agent has unavailable required integrations.',
          href: `/admin/agents/${agent.id}/integrations`,
          ctaLabel: 'Open Agent',
          timestamp: agent.updatedAt,
        });
      }
    }

    const latestDisabled = agent.activity.find((entry) => entry.type === 'disabled');
    if (latestDisabled) {
      pushAttention(items, 'info', {
        resourceType: 'agent',
        resourceName: agent.name,
        reason: 'Agent was recently disabled.',
        href: `/admin/agents/${agent.id}/activity`,
        ctaLabel: 'View Activity',
        timestamp: latestDisabled.timestamp,
      });
    }

    const latestVersion = agent.activity.find((entry) => entry.type === 'version_created');
    if (latestVersion) {
      pushAttention(items, 'info', {
        resourceType: 'agent',
        resourceName: agent.name,
        reason: 'New draft version created.',
        href: `/admin/agents/${agent.id}/versions`,
        ctaLabel: 'View Versions',
        timestamp: latestVersion.timestamp,
      });
    }
  });

  return items
    .sort((a, b) => parseStamp(b.timestamp) - parseStamp(a.timestamp))
    .slice(0, 18);
}

export function groupAttention(items: AttentionItem[]): {
  critical: AttentionItem[];
  warning: AttentionItem[];
  info: AttentionItem[];
} {
  return {
    critical: items.filter((item) => item.severity === 'critical'),
    warning: items.filter((item) => item.severity === 'warning'),
    info: items.filter((item) => item.severity === 'info'),
  };
}

export function deriveRecentActivity(
  agents: ControlPlaneAgent[],
  knowledgeBases: KnowledgeBase[],
  integrations: IntegrationRecord[],
  tools: Tool[] = [],
  testRuns: TestRunResult[] = [],
  conversations: Conversation[] = [],
  calls: CallSession[] = [],
): RecentActivityItem[] {
  return demoActivityService
    .getEvents({ agents, knowledgeBases, tools, integrations, testRuns, conversations, calls }, { limit: 14 })
    .map((event) => ({
      id: event.id,
      message: event.summary,
      resourceName: event.resourceName,
      resourceType: event.resourceType,
      href: event.href,
      timestamp: event.timestamp,
      isDemo: event.isSimulated,
    }));
}

function summarizeKnowledgeForAgent(agentId: string, knowledgeBases: KnowledgeBase[]): string {
  const assigned = knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agentId));
  if (assigned.length === 0) return '0 assigned';
  const readyCount = assigned.filter((kb) => getKnowledgeReadiness(kb) === 'READY').length;
  return `${readyCount}/${assigned.length} ready`;
}

function summarizeToolsForAgent(agentId: string, tools: Tool[]): string {
  const assigned = tools.filter((tool) => tool.assignedAgentIds.includes(agentId));
  if (assigned.length === 0) return '0 assigned';
  const healthyCount = assigned.filter((tool) => tool.validationState !== 'error' && tool.testState !== 'failed').length;
  return `${healthyCount}/${assigned.length} healthy`;
}

function summarizeIntegrationsForAgent(
  agentId: string,
  bindings: AgentBinding[],
  integrations: IntegrationRecord[],
): string {
  const binding = bindings.find((item) => item.id === agentId);
  if (!binding) return '0/0 connected';

  const refs = [
    binding.integrationRefs.intelligenceIntegrationId,
    binding.integrationRefs.voiceIntegrationId,
    binding.integrationRefs.realtimeIntegrationId,
    binding.integrationRefs.callingIntegrationId,
  ].filter((ref): ref is NonNullable<typeof ref> => Boolean(ref));

  if (refs.length === 0) return '0 assigned';

  const integrationById = new Map(integrations.map((integration) => [integration.id, integration]));
  const connected = refs.filter((ref) => integrationById.get(ref)?.status === 'connected').length;

  return `${connected}/${refs.length} connected`;
}

export function deriveAgentSummaryRows(
  agents: ControlPlaneAgent[],
  bindings: AgentBinding[],
  integrations: IntegrationRecord[],
  knowledgeBases: KnowledgeBase[],
  tools: Tool[],
): AgentActivitySummaryRow[] {
  return agents
    .map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      version: agent.publishedVersion ?? 'Draft',
      integrationSummary: summarizeIntegrationsForAgent(agent.id, bindings, integrations),
      knowledgeSummary: summarizeKnowledgeForAgent(agent.id, knowledgeBases),
      toolSummary: summarizeToolsForAgent(agent.id, tools),
      lastActivity: agent.activity[0]?.timestamp ?? agent.updatedAt,
    }))
    .sort((a, b) => parseStamp(b.lastActivity) - parseStamp(a.lastActivity));
}

export function deriveIntegrationHealthRows(integrations: IntegrationRecord[]): IntegrationHealthRow[] {
  return integrations
    .filter((integration) => integration.status === 'connected' || integration.usedByAgents.length > 0)
    .map((integration) => ({
      integrationId: integration.id,
      name: integration.name,
      provider: integration.config.provider || 'Not set',
      capability: capabilityLabel(integration.capability),
      status: statusLabel(integration.status),
      agentsUsing: integration.usedByAgents.length,
      lastTested: integration.lastTested,
      href: '/admin/integrations',
    }))
    .sort((a, b) => b.agentsUsing - a.agentsUsing);
}

export function readinessCounts(knowledgeBases: KnowledgeBase[]): Record<KnowledgeReadiness, number> {
  const counts = asNumberMap(['READY', 'INDEXING', 'EMPTY', 'FAILED', 'DISABLED'] as const);
  knowledgeBases.forEach((kb) => {
    const readiness = getKnowledgeReadiness(kb);
    counts[readiness] += 1;
  });
  return counts;
}
