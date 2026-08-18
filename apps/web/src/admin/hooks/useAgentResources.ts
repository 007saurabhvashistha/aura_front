import { useIntegrationRegistry } from './useIntegrationRegistry';
import { useKnowledgeRegistry } from './useKnowledgeRegistry';
import { useToolRegistry } from './useToolRegistry';

// Copies a source agent's resource assignments (integration bindings, knowledge
// bases, tools) onto a target agent. Each assignment stays owned by its own
// registry; this only fans the same stable IDs out to the target agent ID.
export function useAgentResources() {
  const integration = useIntegrationRegistry();
  const knowledge = useKnowledgeRegistry();
  const tools = useToolRegistry();

  const cloneResources = (sourceId: string, targetId: string, targetName?: string): void => {
    const binding = integration.agents.find((agent) => agent.id === sourceId);
    if (binding) {
      integration.setAgentIntegrationRefs(targetId, { ...binding.integrationRefs }, targetName);
    }
    knowledge.knowledgeBases
      .filter((kb) => kb.assignedAgentIds.includes(sourceId))
      .forEach((kb) => knowledge.assignAgent(kb.id, targetId));
    tools.tools
      .filter((tool) => tool.assignedAgentIds.includes(sourceId))
      .forEach((tool) => tools.assignAgent(tool.id, targetId));
  };

  return { cloneResources };
}
