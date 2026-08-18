import { useMemo } from 'react';
import { useAgentRegistry } from './useAgentRegistry';
import { useIntegrationRegistry } from './useIntegrationRegistry';
import { useKnowledgeRegistry } from './useKnowledgeRegistry';
import { useToolRegistry } from './useToolRegistry';
import { useTestRuns } from './useTestRuns';
import { demoActivityService, type ActivityQuery } from '../services/activity';

// Single read path for audit events so global Activity, Agent Detail, and the
// Control Center overview never diverge.
export function useActivity(query: ActivityQuery = {}) {
  const { agents } = useAgentRegistry();
  const { integrations } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();
  const { runs } = useTestRuns();

  const context = useMemo(
    () => ({ agents, knowledgeBases, tools, integrations, testRuns: runs }),
    [agents, knowledgeBases, tools, integrations, runs],
  );

  const events = useMemo(() => demoActivityService.getEvents(context, query), [context, query]);
  const actors = useMemo(() => demoActivityService.getActors(context), [context]);

  return { events, actors, mode: demoActivityService.mode };
}
