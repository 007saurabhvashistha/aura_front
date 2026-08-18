import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAgentRegistry } from './useAgentRegistry';
import { useIntegrationRegistry } from './useIntegrationRegistry';
import { useKnowledgeRegistry } from './useKnowledgeRegistry';
import { useToolRegistry } from './useToolRegistry';
import {
  simulatedTestExecutionService,
  type TestExecutionMode,
  type TestRunRequest,
  type TestRunResult,
} from '../services/testCenter';

// Single entry point for every test executed from Admin (Test Center, Agent
// Detail, Agent Builder) so all surfaces share one execution path and history.

interface TestRunsContextValue {
  runs: TestRunResult[];
  mode: TestExecutionMode;
  getRunById: (id: string) => TestRunResult | null;
  runTest: (request: TestRunRequest) => TestRunResult;
  clearRuns: () => void;
}

const TestRunsContext = createContext<TestRunsContextValue | undefined>(undefined);

const MAX_RUNS = 50;

export function TestRunsProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<TestRunResult[]>([]);

  const { agents, logActivity } = useAgentRegistry();
  const { integrations, agents: integrationBindings } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();

  const service = simulatedTestExecutionService;

  const getRunById = useCallback((id: string): TestRunResult | null => runs.find((run) => run.id === id) ?? null, [runs]);

  const runTest = useCallback(
    (request: TestRunRequest): TestRunResult => {
      const result = service.execute(request, {
        agents,
        integrations,
        integrationBindings,
        knowledgeBases,
        tools,
      });
      setRuns((prev) => [result, ...prev].slice(0, MAX_RUNS));
      if (agents.some((agent) => agent.id === request.agentId)) {
        logActivity(
          request.agentId,
          'test_executed',
          `${request.testType} test ${result.status} (${service.mode.toLowerCase()}).`,
        );
      }
      return result;
    },
    [service, agents, integrations, integrationBindings, knowledgeBases, tools, logActivity],
  );

  const clearRuns = useCallback((): void => setRuns([]), []);

  const value = useMemo<TestRunsContextValue>(
    () => ({ runs, mode: service.mode, getRunById, runTest, clearRuns }),
    [runs, service.mode, getRunById, runTest, clearRuns],
  );

  return <TestRunsContext.Provider value={value}>{children}</TestRunsContext.Provider>;
}

export function useTestRuns(): TestRunsContextValue {
  const context = useContext(TestRunsContext);
  if (!context) {
    throw new Error('useTestRuns must be used within a TestRunsProvider');
  }
  return context;
}
