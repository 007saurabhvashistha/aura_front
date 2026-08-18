// Demo agent references used to resolve stable agent IDs to display names in the
// Control Plane foundation. These IDs intentionally match the agent bindings in
// useIntegrationRegistry so knowledge/tool/integration assignments stay consistent.
// Replace with real API state when the backend is wired.

export type AgentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface DemoAgentRef {
  id: string;
  name: string;
  status: AgentLifecycleStatus;
}

export const DEMO_AGENTS: DemoAgentRef[] = [
  { id: 'agent-maya', name: 'Maya', status: 'published' },
  { id: 'agent-aura-companion', name: 'Aura Companion', status: 'published' },
  { id: 'agent-support', name: 'Support Agent', status: 'draft' },
  { id: 'agent-phone-assistant', name: 'Phone Assistant', status: 'disabled' },
];

export function getAgentName(agentId: string): string {
  return DEMO_AGENTS.find((agent) => agent.id === agentId)?.name ?? agentId;
}
