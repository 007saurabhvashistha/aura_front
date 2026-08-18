import type { AgentActivityType, ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { KnowledgeActivityType, KnowledgeBase } from '../../hooks/useKnowledgeRegistry';
import type { Tool, ToolActivityType } from '../../hooks/useToolRegistry';
import { TEST_ENVIRONMENT_LABELS, TEST_TYPE_LABELS, type TestRunResult } from '../testCenter';
import type {
  ActivityCategory,
  ActivityContext,
  ActivityEvent,
  ActivityQuery,
  ActivityService,
  ActivityStatus,
} from './ActivityService';

function parseStamp(stamp: string): number {
  const parsed = Date.parse(stamp.replace(' ', 'T'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function agentCategory(type: AgentActivityType): ActivityCategory {
  if (type === 'configuration_updated') return 'configuration';
  if (type === 'knowledge_assigned' || type === 'knowledge_removed' || type === 'tool_assigned' || type === 'tool_removed' || type === 'integration_changed') {
    return 'assignment';
  }
  if (type === 'test_executed') return 'test';
  return 'lifecycle';
}

function knowledgeCategory(type: KnowledgeActivityType): ActivityCategory {
  if (type === 'agent_assigned' || type === 'agent_removed') return 'assignment';
  if (type === 'source_added' || type === 'source_removed' || type === 'source_processing' || type === 'index_completed' || type === 'index_failed') {
    return 'processing';
  }
  if (type === 'updated') return 'configuration';
  return 'lifecycle';
}

function toolCategory(type: ToolActivityType): ActivityCategory {
  if (type === 'config_updated' || type === 'auth_updated' || type === 'schema_updated' || type === 'updated') return 'configuration';
  if (type === 'agent_assigned' || type === 'agent_removed') return 'assignment';
  if (type === 'tested' || type === 'test_failed' || type === 'dry_run') return 'test';
  if (type === 'validated' || type === 'validation_failed') return 'processing';
  return 'lifecycle';
}

// Status comes from the action type and the message, because some registries log
// a failed outcome under a neutral type (e.g. agent 'test_executed').
function statusFromType(type: string, message = ''): ActivityStatus {
  const haystack = `${type} ${message}`.toLowerCase();
  if (haystack.includes('failed') || haystack.includes('blocked')) return 'failure';
  if (type === 'created' || type === 'duplicated' || type === 'version_created') return 'info';
  return 'success';
}

function matches(event: ActivityEvent, query: ActivityQuery): boolean {
  if (query.resourceType && query.resourceType !== 'all' && event.resourceType !== query.resourceType) return false;
  if (query.status && query.status !== 'all' && event.status !== query.status) return false;
  if (query.category && query.category !== 'all' && event.category !== query.category) return false;
  if (query.actor && query.actor !== 'all' && event.actor !== query.actor) return false;
  if (query.resourceId && event.resourceId !== query.resourceId) return false;
  if (query.from && parseStamp(event.timestamp) < parseStamp(`${query.from} 00:00`)) return false;
  if (query.to && parseStamp(event.timestamp) > parseStamp(`${query.to} 23:59`)) return false;

  const search = query.search?.trim().toLowerCase();
  if (search) {
    const haystack = [event.summary, event.resourceName, event.actor, event.action, event.resourceType]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}

function agentEvents(agents: ControlPlaneAgent[]): ActivityEvent[] {
  return agents.flatMap((agent) =>
    agent.activity.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.type,
      summary: entry.message,
      resourceType: 'agent' as const,
      resourceId: agent.id,
      resourceName: agent.name,
      status: statusFromType(entry.type, entry.message),
      category: agentCategory(entry.type),
      href: `/admin/agents/${agent.id}`,
      isSimulated: true,
      metadata: {
        'Agent status': agent.status,
        'Published version': agent.publishedVersion ?? '—',
        Environment: agent.environment,
      },
    })),
  );
}

function knowledgeEvents(knowledgeBases: KnowledgeBase[]): ActivityEvent[] {
  return knowledgeBases.flatMap((kb) =>
    kb.activity.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.type,
      summary: entry.message,
      resourceType: 'knowledge' as const,
      resourceId: kb.id,
      resourceName: kb.name,
      status: statusFromType(entry.type, entry.message),
      category: knowledgeCategory(entry.type),
      href: `/admin/knowledge/${kb.id}`,
      isSimulated: true,
      metadata: {
        'Index status': kb.indexStatus,
        Sources: String(kb.sources.length),
        'Assigned agents': String(kb.assignedAgentIds.length),
      },
    })),
  );
}

function toolEvents(tools: Tool[]): ActivityEvent[] {
  return tools.flatMap((tool) =>
    tool.activity.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.type,
      summary: entry.message,
      resourceType: 'tool' as const,
      resourceId: tool.id,
      resourceName: tool.name,
      status: statusFromType(entry.type, entry.message),
      category: toolCategory(entry.type),
      href: `/admin/tools/${tool.id}`,
      isSimulated: true,
      metadata: {
        Type: tool.type,
        Validation: tool.validationState,
        Test: tool.testState,
        Enabled: tool.enabled ? 'Yes' : 'No',
      },
    })),
  );
}

function integrationEvents(integrations: IntegrationRecord[]): ActivityEvent[] {
  return integrations
    .filter((integration) => integration.lastTested !== 'Never')
    .map((integration) => ({
      id: `integration-${integration.id}-${integration.lastTested}`,
      timestamp: integration.lastTested,
      actor: 'Aman Ops',
      action: `connection_${integration.status}`,
      summary: `${integration.name} connection is ${integration.status.replace('_', ' ')}.`,
      resourceType: 'integration' as const,
      resourceId: integration.id,
      resourceName: integration.name,
      status: integration.status === 'connected' ? ('success' as const) : ('failure' as const),
      category: 'connection' as const,
      href: '/admin/integrations',
      isSimulated: true,
      metadata: {
        Provider: integration.config.provider || 'Not set',
        Capability: integration.capability,
        'Used by agents': String(integration.usedByAgents.length),
        Enabled: integration.enabled ? 'Yes' : 'No',
      },
    }));
}

function testEvents(testRuns: TestRunResult[]): ActivityEvent[] {
  return testRuns.map((run) => ({
    id: `test-${run.id}`,
    timestamp: run.startedAt,
    actor: 'Aman Ops',
    action: `test_${run.status}`,
    summary: `${TEST_TYPE_LABELS[run.request.testType]} test ${run.status} for ${run.agentName}.`,
    resourceType: 'test' as const,
    resourceId: run.request.agentId,
    resourceName: run.agentName,
    status: run.status === 'passed' ? ('success' as const) : ('failure' as const),
    category: 'test' as const,
    href: `/admin/test/runs/${run.id}`,
    isSimulated: run.mode === 'SIMULATED',
    metadata: {
      'Test type': TEST_TYPE_LABELS[run.request.testType],
      Version: run.request.versionLabel,
      Environment: TEST_ENVIRONMENT_LABELS[run.request.environment],
      Latency: `${run.totalLatencyMs} ms`,
      Errors: String(run.errors.length),
      Mode: run.mode,
    },
  }));
}

export class DemoActivityAdapter implements ActivityService {
  readonly mode = 'SIMULATED' as const;

  getEvents(context: ActivityContext, query: ActivityQuery = {}): ActivityEvent[] {
    const events = [
      ...agentEvents(context.agents),
      ...knowledgeEvents(context.knowledgeBases),
      ...toolEvents(context.tools),
      ...integrationEvents(context.integrations),
      ...testEvents(context.testRuns),
    ]
      .filter((event) => matches(event, query))
      .sort((a, b) => parseStamp(b.timestamp) - parseStamp(a.timestamp));

    return typeof query.limit === 'number' ? events.slice(0, query.limit) : events;
  }

  getActors(context: ActivityContext): string[] {
    return [...new Set(this.getEvents(context).map((event) => event.actor))].sort();
  }
}

export const demoActivityService: ActivityService = new DemoActivityAdapter();
