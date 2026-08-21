import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { KnowledgeBase } from '../../hooks/useKnowledgeRegistry';
import type { Tool } from '../../hooks/useToolRegistry';
import type { CallSession, Conversation } from '../../hooks/useConversationRegistry';
import type { SocialProfile } from '../../hooks/useSocialRegistry';
import type { Companion } from '../companion';
import type { TestRunResult } from '../testCenter';

// Audit contract for the whole control plane: Who -> Did What -> To Which
// Resource -> When -> Result. Every surface (global Activity, Agent Detail
// Activity, Control Center recent activity) reads through this one shape.

export type ActivityResourceType =
  | 'agent'
  | 'knowledge'
  | 'tool'
  | 'integration'
  | 'test'
  | 'companion'
  | 'profile'
  | 'conversation'
  | 'call';

export type ActivityStatus = 'success' | 'failure' | 'info';

export type ActivityCategory =
  | 'lifecycle'
  | 'configuration'
  | 'assignment'
  | 'processing'
  | 'test'
  | 'connection'
  | 'social'
  | 'conversation'
  | 'call';

export type ActivityMode = 'SIMULATED' | 'REAL';

export const ACTIVITY_RESOURCE_LABELS: Record<ActivityResourceType, string> = {
  agent: 'Agent',
  knowledge: 'Knowledge',
  tool: 'Tool',
  integration: 'Integration',
  test: 'Test run',
  companion: 'Companion',
  profile: 'Profile',
  conversation: 'Conversation',
  call: 'Call',
};

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  lifecycle: 'Lifecycle',
  configuration: 'Configuration',
  assignment: 'Assignment',
  processing: 'Processing',
  test: 'Test',
  connection: 'Connection',
  social: 'Social',
  conversation: 'Conversation',
  call: 'Call',
};

export interface ActivityEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  summary: string;
  resourceType: ActivityResourceType;
  resourceId: string;
  resourceName: string;
  status: ActivityStatus;
  category: ActivityCategory;
  href: string;
  isSimulated: boolean;
  metadata: Record<string, string>;
}

export interface ActivityQuery {
  search?: string;
  resourceType?: ActivityResourceType | 'all';
  status?: ActivityStatus | 'all';
  category?: ActivityCategory | 'all';
  actor?: string | 'all';
  resourceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ActivityContext {
  agents: ControlPlaneAgent[];
  knowledgeBases: KnowledgeBase[];
  tools: Tool[];
  integrations: IntegrationRecord[];
  testRuns: TestRunResult[];
  companions?: Companion[];
  profiles?: SocialProfile[];
  conversations?: Conversation[];
  calls?: CallSession[];
}

export interface ActivityService {
  mode: ActivityMode;
  getEvents: (context: ActivityContext, query?: ActivityQuery) => ActivityEvent[];
  getActors: (context: ActivityContext) => string[];
}
