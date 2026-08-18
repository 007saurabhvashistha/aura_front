import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { AgentBinding, IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { KnowledgeBase } from '../../hooks/useKnowledgeRegistry';
import type { Tool } from '../../hooks/useToolRegistry';

// Frontend contract for every test executed from Aura Admin. The UI depends only
// on this shape, so SimulatedTestExecutionAdapter can be replaced by a
// RealTestExecutionAdapter without any UI rewrite.

export type TestType = 'conversation' | 'voice' | 'tool' | 'knowledge' | 'integration' | 'end_to_end';

export type TestEnvironment = 'demo' | 'staging' | 'production';

export type TestExecutionMode = 'SIMULATED' | 'REAL';

export type TestStatus = 'passed' | 'failed' | 'skipped';

export type TestStage = 'input' | 'agent' | 'knowledge' | 'tool' | 'integration' | 'output';

export type TestResourceType = 'agent' | 'knowledge' | 'tool' | 'integration';

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  conversation: 'Text conversation',
  voice: 'Voice readiness',
  tool: 'Tool execution',
  knowledge: 'Knowledge retrieval',
  integration: 'Integration connectivity',
  end_to_end: 'End-to-end agent flow',
};

export const TEST_ENVIRONMENT_LABELS: Record<TestEnvironment, string> = {
  demo: 'Demo (simulated)',
  staging: 'Staging',
  production: 'Production',
};

export interface TestTraceStep {
  id: string;
  stage: TestStage;
  label: string;
  detail: string;
  status: TestStatus;
  latencyMs: number;
  resourceType?: TestResourceType;
  resourceId?: string;
  href?: string;
  error?: string;
}

export interface TestRunRequest {
  agentId: string;
  versionLabel: string;
  environment: TestEnvironment;
  testType: TestType;
  input: string;
}

export interface TestRunResult {
  id: string;
  request: TestRunRequest;
  agentName: string;
  mode: TestExecutionMode;
  status: 'passed' | 'failed';
  startedAt: string;
  totalLatencyMs: number;
  output: string;
  errors: string[];
  trace: TestTraceStep[];
}

// Registry snapshot the adapter reads from. Passing it in keeps the adapter pure
// and makes the future API adapter a drop-in replacement.
export interface TestExecutionContext {
  agents: ControlPlaneAgent[];
  integrations: IntegrationRecord[];
  integrationBindings: AgentBinding[];
  knowledgeBases: KnowledgeBase[];
  tools: Tool[];
}

export interface TestExecutionService {
  mode: TestExecutionMode;
  execute: (request: TestRunRequest, context: TestExecutionContext) => TestRunResult;
}
