import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { AgentBinding, IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { KnowledgeBase } from '../../hooks/useKnowledgeRegistry';
import type { Tool } from '../../hooks/useToolRegistry';
import type { CallSession, Conversation } from '../../hooks/useConversationRegistry';
import type { TestRunResult } from '../testCenter';

export type HealthLevel = 'healthy' | 'attention' | 'critical';
export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface ControlPlaneDomainHealth {
  key: 'agents' | 'integrations' | 'knowledge' | 'tools';
  label: string;
  level: HealthLevel;
  summary: string;
  reason: string;
  href: string;
}

export interface ControlPlaneMetric {
  id: string;
  label: string;
  value: string;
  note: string;
  href?: string;
  isDemo?: boolean;
}

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  resourceType: 'agent' | 'integration' | 'knowledge' | 'tool' | 'platform';
  resourceName: string;
  reason: string;
  href: string;
  ctaLabel: string;
  timestamp?: string;
}

export interface DistributionSegment {
  key: string;
  label: string;
  count: number;
}

export interface OperationalHealthCard {
  key: 'agents' | 'integrations' | 'knowledge' | 'tools' | 'conversations';
  title: string;
  href: string;
  segments: DistributionSegment[];
}

export interface RecentActivityItem {
  id: string;
  message: string;
  resourceName: string;
  resourceType: 'agent' | 'knowledge' | 'integration' | 'tool' | 'test' | 'companion' | 'profile' | 'conversation' | 'call';
  href: string;
  timestamp: string;
  isDemo: boolean;
}

export interface AgentActivitySummaryRow {
  agentId: string;
  agentName: string;
  status: string;
  version: string;
  integrationSummary: string;
  knowledgeSummary: string;
  toolSummary: string;
  lastActivity: string;
}

export interface IntegrationHealthRow {
  integrationId: string;
  name: string;
  provider: string;
  capability: string;
  status: string;
  agentsUsing: number;
  lastTested: string;
  href: string;
}

export interface ControlPlaneOverview {
  overallHealth: HealthLevel;
  domains: ControlPlaneDomainHealth[];
  metrics: ControlPlaneMetric[];
  simulatedMetrics: ControlPlaneMetric[];
  attention: {
    critical: AttentionItem[];
    warning: AttentionItem[];
    info: AttentionItem[];
  };
  operationalHealth: OperationalHealthCard[];
  recentActivity: RecentActivityItem[];
  agentSummary: AgentActivitySummaryRow[];
  integrationHealth: IntegrationHealthRow[];
}

export interface ControlPlaneOverviewInput {
  agents: ControlPlaneAgent[];
  integrationBindings: AgentBinding[];
  integrations: IntegrationRecord[];
  knowledgeBases: KnowledgeBase[];
  tools: Tool[];
  testRuns?: TestRunResult[];
  conversations?: Conversation[];
  calls?: CallSession[];
}

export interface ControlPlaneOverviewService {
  createOverview: (input: ControlPlaneOverviewInput) => ControlPlaneOverview;
}
