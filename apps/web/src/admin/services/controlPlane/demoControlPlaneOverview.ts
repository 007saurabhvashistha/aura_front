import type {
  ControlPlaneMetric,
  ControlPlaneOverview,
  ControlPlaneOverviewInput,
  ControlPlaneOverviewService,
  HealthLevel,
  OperationalHealthCard,
} from './ControlPlaneOverviewService';
import {
  deriveAgentStatusSegments,
  deriveAgentSummaryRows,
  deriveAttentionItems,
  deriveIntegrationHealthRows,
  deriveIntegrationStatusSegments,
  deriveKnowledgeStatusSegments,
  deriveRecentActivity,
  deriveToolStatusSegments,
  groupAttention,
  readinessCounts,
} from './controlPlaneMappers';

function levelFromCounts(critical: number, warning: number): HealthLevel {
  if (critical > 0) return 'critical';
  if (warning > 0) return 'attention';
  return 'healthy';
}

function buildOperationalHealth(input: ControlPlaneOverviewInput): OperationalHealthCard[] {
  const agentSegments = deriveAgentStatusSegments(input.agents);
  const integrationSegments = deriveIntegrationStatusSegments(input.integrations);
  const knowledgeSegments = deriveKnowledgeStatusSegments(input.knowledgeBases);
  const toolSegments = deriveToolStatusSegments(input.tools);

  return [
    {
      key: 'agents',
      title: 'Agents',
      href: '/admin/agents',
      segments: agentSegments,
    },
    {
      key: 'integrations',
      title: 'Integrations',
      href: '/admin/integrations',
      segments: integrationSegments,
    },
    {
      key: 'knowledge',
      title: 'Knowledge',
      href: '/admin/knowledge',
      segments: knowledgeSegments,
    },
    {
      key: 'tools',
      title: 'Tools',
      href: '/admin/tools',
      segments: toolSegments,
    },
  ];
}

function buildMetrics(input: ControlPlaneOverviewInput, attentionTotal: number): ControlPlaneMetric[] {
  const published = input.agents.filter((agent) => agent.status === 'published').length;
  const knowledgeReady = input.knowledgeBases.filter((kb) => kb.sources.length > 0).length;
  const toolsEnabled = input.tools.filter((tool) => tool.enabled).length;
  const integrationsConnected = input.integrations.filter((integration) => integration.status === 'connected').length;

  return [
    {
      id: 'agents-total',
      label: 'Agents',
      value: String(input.agents.length),
      note: `${published} published`,
      href: '/admin/agents',
    },
    {
      id: 'agents-active',
      label: 'Active',
      value: String(published),
      note: 'Published and serving',
      href: '/admin/agents',
    },
    {
      id: 'knowledge-ready',
      label: 'Knowledge',
      value: String(knowledgeReady),
      note: 'Knowledge bases with content',
      href: '/admin/knowledge',
    },
    {
      id: 'tools-enabled',
      label: 'Tools',
      value: String(toolsEnabled),
      note: 'Enabled tools',
      href: '/admin/tools',
    },
    {
      id: 'integrations-connected',
      label: 'Integrations',
      value: String(integrationsConnected),
      note: 'Connected providers',
      href: '/admin/integrations',
    },
    {
      id: 'attention-total',
      label: 'Attention',
      value: String(attentionTotal),
      note: attentionTotal === 0 ? 'All systems operational' : 'Needs review',
    },
  ];
}

function buildSimulatedMetrics(input: ControlPlaneOverviewInput): ControlPlaneMetric[] {
  const base = input.agents.length * 14 + input.tools.length * 3;
  return [
    {
      id: 'sim-conversations-today',
      label: "Today's conversations",
      value: String(base),
      note: 'Demo metric from frontend adapter',
      isDemo: true,
      href: '/admin/conversations/history',
    },
    {
      id: 'sim-active-conversations',
      label: 'Active conversations',
      value: String(Math.max(1, Math.floor(base / 12))),
      note: 'Demo metric from frontend adapter',
      isDemo: true,
      href: '/admin/conversations/live',
    },
    {
      id: 'sim-estimated-cost',
      label: 'Usage / cost snapshot',
      value: `$${(base * 0.18).toFixed(2)}`,
      note: 'Demo estimate for control-plane UX',
      isDemo: true,
      href: '/admin/analytics',
    },
  ];
}

export function createDemoControlPlaneOverview(input: ControlPlaneOverviewInput): ControlPlaneOverview {
  const attentionItems = deriveAttentionItems(
    input.agents,
    input.integrationBindings,
    input.integrations,
    input.knowledgeBases,
    input.tools,
  );
  const attention = groupAttention(attentionItems);

  const integrationConnected = input.integrations.filter((integration) => integration.status === 'connected').length;
  const integrationNeedsAttention = input.integrations.filter(
    (integration) => integration.status === 'failed' || integration.status === 'validation_error' || integration.status === 'disabled',
  ).length;

  const readiness = readinessCounts(input.knowledgeBases);
  const toolsFailed = input.tools.filter((tool) => tool.validationState === 'error' || tool.testState === 'failed').length;

  const domains = [
    {
      key: 'agents' as const,
      label: 'Agents',
      level: levelFromCounts(
        attention.critical.filter((item) => item.resourceType === 'agent').length,
        attention.warning.filter((item) => item.resourceType === 'agent').length,
      ),
      summary: `${input.agents.length} total · ${input.agents.filter((agent) => agent.status === 'published').length} published · ${input.agents.filter((agent) => agent.status === 'draft').length} draft`,
      reason: 'Lifecycle and publish readiness across the agent fleet.',
      href: '/admin/agents',
    },
    {
      key: 'integrations' as const,
      label: 'Integrations',
      level: levelFromCounts(
        attention.critical.filter((item) => item.resourceType === 'integration').length,
        attention.warning.filter((item) => item.resourceType === 'integration').length,
      ),
      summary: `${integrationConnected} connected · ${integrationNeedsAttention} needs attention`,
      reason: 'Provider connectivity and assignment health.',
      href: '/admin/integrations',
    },
    {
      key: 'knowledge' as const,
      label: 'Knowledge',
      level: levelFromCounts(
        attention.critical.filter((item) => item.resourceType === 'knowledge').length,
        attention.warning.filter((item) => item.resourceType === 'knowledge').length,
      ),
      summary: `${readiness.READY} ready · ${readiness.INDEXING} indexing · ${readiness.FAILED} failed`,
      reason: 'Source indexing and retrieval readiness.',
      href: '/admin/knowledge',
    },
    {
      key: 'tools' as const,
      label: 'Tools',
      level: levelFromCounts(
        attention.critical.filter((item) => item.resourceType === 'tool').length,
        attention.warning.filter((item) => item.resourceType === 'tool').length,
      ),
      summary: `${input.tools.filter((tool) => tool.enabled).length} enabled · ${toolsFailed} failing`,
      reason: 'Tool validation and execution test outcomes.',
      href: '/admin/tools',
    },
  ];

  const overallHealth = levelFromCounts(attention.critical.length, attention.warning.length);
  const operationalHealth = buildOperationalHealth(input);

  return {
    overallHealth,
    domains,
    metrics: buildMetrics(input, attentionItems.length),
    simulatedMetrics: buildSimulatedMetrics(input),
    attention,
    operationalHealth,
    recentActivity: deriveRecentActivity(
      input.agents,
      input.knowledgeBases,
      input.integrations,
      input.tools,
      input.testRuns ?? [],
    ),
    agentSummary: deriveAgentSummaryRows(
      input.agents,
      input.integrationBindings,
      input.integrations,
      input.knowledgeBases,
      input.tools,
    ),
    integrationHealth: deriveIntegrationHealthRows(input.integrations),
  };
}

export const demoControlPlaneOverviewService: ControlPlaneOverviewService = {
  createOverview: createDemoControlPlaneOverview,
};
