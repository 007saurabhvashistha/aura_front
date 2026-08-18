import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEMO_AGENTS, type AgentLifecycleStatus } from '../data/demoAgents';

// Agent Control Center state. AgentRegistry is the single frontend source of
// truth for agent identity, configuration, lifecycle, versions, and activity —
// keyed by the same stable agent IDs used by the Integration, Knowledge, and
// Tool registries. Integration/knowledge/tool ASSIGNMENTS are NOT duplicated
// here; they remain owned by their registries and resolve by agent ID.
// Demo state only — no backend persistence; nothing survives a full reload.

export type AgentStatus = 'draft' | 'published' | 'disabled' | 'error' | 'archived';

export type AgentActivityType =
  | 'created'
  | 'duplicated'
  | 'configuration_updated'
  | 'version_created'
  | 'knowledge_assigned'
  | 'knowledge_removed'
  | 'tool_assigned'
  | 'tool_removed'
  | 'integration_changed'
  | 'test_executed'
  | 'published'
  | 'disabled'
  | 'enabled'
  | 'archived'
  | 'restored';

// Persistable agent configuration authored in Agent Builder. Excludes identity
// (name/description) and lifecycle (status) — those live on the agent — and
// excludes integration selections, which are owned by the Integration Registry.
export interface AgentConfig {
  avatarUrl: string;
  systemPrompt: string;
  personality: string;
  goals: string;
  restrictions: string;
  conversationRules: string;
  voiceProvider: string;
  voiceName: string;
  language: string;
  speed: string;
  tone: string;
  llmProvider: string;
  model: string;
  temperature: string;
  contextWindow: string;
  knowledgeSources: string;
  knowledgeDocuments: string[];
  knowledgeUrlList: string[];
  knowledgeFaqList: { question: string; answer: string }[];
  livekitEnabled: boolean;
  cartesiaEnabled: boolean;
  telephonyEnabled: boolean;
  customApiEnabled: boolean;
  webhookUrl: string;
  customApiBaseUrl: string;
  customApiKey: string;
  livekitRoomPreset: string;
  cartesiaVoiceProfile: string;
  telephonyNumber: string;
  testScenario: string;
  testNotes: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  avatarUrl: '',
  systemPrompt: '',
  personality: '',
  goals: '',
  restrictions: '',
  conversationRules: '',
  voiceProvider: 'cartesia',
  voiceName: '',
  language: 'en-US',
  speed: '1.0',
  tone: 'empathetic',
  llmProvider: 'openai',
  model: 'gpt-4.1-mini',
  temperature: '0.6',
  contextWindow: 'long',
  knowledgeSources: '',
  knowledgeDocuments: [],
  knowledgeUrlList: [],
  knowledgeFaqList: [],
  livekitEnabled: true,
  cartesiaEnabled: true,
  telephonyEnabled: false,
  customApiEnabled: false,
  webhookUrl: '',
  customApiBaseUrl: '',
  customApiKey: '',
  livekitRoomPreset: 'support-room',
  cartesiaVoiceProfile: 'balanced',
  telephonyNumber: '',
  testScenario: '',
  testNotes: '',
};

export interface AgentVersion {
  id: string;
  label: string;
  status: 'published' | 'archived' | 'draft';
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
}

export interface AgentActivityEntry {
  id: string;
  type: AgentActivityType;
  message: string;
  actor: string;
  timestamp: string;
}

export interface ControlPlaneAgent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  environment: 'production' | 'staging';
  createdAt: string;
  updatedAt: string;
  publishedVersion: string | null;
  config: AgentConfig;
  versions: AgentVersion[];
  activity: AgentActivityEntry[];
}

interface AgentRegistryContextValue {
  agents: ControlPlaneAgent[];
  getAgentById: (id: string) => ControlPlaneAgent | null;
  createAgent: (input: { name: string; description: string; config?: AgentConfig }) => ControlPlaneAgent;
  updateAgent: (id: string, input: { name?: string; description?: string; config: AgentConfig }) => void;
  duplicateAgent: (id: string) => ControlPlaneAgent | null;
  publishAgent: (id: string) => void;
  disableAgent: (id: string) => void;
  enableAgent: (id: string) => void;
  archiveAgent: (id: string) => void;
  restoreAgent: (id: string) => void;
  createNewVersion: (id: string) => void;
  logActivity: (id: string, type: AgentActivityType, message: string) => void;
}

const AgentRegistryContext = createContext<AgentRegistryContextValue | undefined>(undefined);

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

const ACTOR = 'Aman Ops';

function nextVersionLabel(versions: AgentVersion[]): string {
  const numbers = versions
    .map((version) => Number.parseInt(version.label.replace(/^v/i, ''), 10))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `v${max + 1}`;
}

function makeActivity(agentId: string, type: AgentActivityType, message: string): AgentActivityEntry {
  return {
    id: `${agentId}-act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    actor: ACTOR,
    timestamp: nowStamp(),
  };
}

// Ensure there is an editable draft version at the top of the stack; config
// edits always target a draft (a published version is immutable).
function ensureDraftVersion(agent: ControlPlaneAgent): AgentVersion[] {
  if (agent.versions[0]?.status === 'draft') return agent.versions;
  const stamp = nowStamp();
  const label = nextVersionLabel(agent.versions);
  const draft: AgentVersion = { id: `${agent.id}-${label}`, label, status: 'draft', createdAt: stamp, createdBy: ACTOR, publishedAt: null };
  return [draft, ...agent.versions];
}

const SEED_DETAILS: Record<string, { description: string; createdAt: string; updatedAt: string }> = {
  'agent-maya': { description: 'Warm companion agent tuned for everyday conversations.', createdAt: '2026-07-28 09:14', updatedAt: '2026-08-10 21:05' },
  'agent-aura-companion': { description: 'Flagship Aura companion with voice and realtime enabled.', createdAt: '2026-07-20 15:02', updatedAt: '2026-08-11 08:22' },
  'agent-support': { description: 'Support-focused agent bound to product knowledge and CRM tools.', createdAt: '2026-08-01 11:40', updatedAt: '2026-08-11 08:05' },
  'agent-phone-assistant': { description: 'Telephony assistant prototype, currently disabled.', createdAt: '2026-08-05 18:31', updatedAt: '2026-08-09 22:03' },
};

function seedConfig(agentId: string): AgentConfig {
  const name = DEMO_AGENTS.find((agent) => agent.id === agentId)?.name ?? 'an Aura agent';
  return {
    ...DEFAULT_AGENT_CONFIG,
    systemPrompt: `You are ${name}.`,
    personality: 'warm',
    goals: 'Help the user and keep the conversation natural.',
    restrictions: 'Do not share sensitive information.',
    voiceName: 'calm-female-v1',
  };
}

function buildSeedAgents(): ControlPlaneAgent[] {
  return DEMO_AGENTS.map((agent) => {
    const details = SEED_DETAILS[agent.id] ?? { description: 'Demo agent.', createdAt: '2026-08-01 00:00', updatedAt: '2026-08-01 00:00' };
    const status: AgentStatus = agent.status as AgentLifecycleStatus;
    const publishedVersion = status === 'published' ? 'v3' : null;

    return {
      id: agent.id,
      name: agent.name,
      description: details.description,
      status,
      environment: 'production' as const,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
      publishedVersion,
      config: seedConfig(agent.id),
      versions: [
        {
          id: `${agent.id}-v3`,
          label: 'v3',
          status: status === 'published' ? 'published' : 'draft',
          createdAt: details.updatedAt,
          createdBy: ACTOR,
          publishedAt: status === 'published' ? details.updatedAt : null,
        },
        { id: `${agent.id}-v2`, label: 'v2', status: 'archived', createdAt: '2026-08-03 10:00', createdBy: ACTOR, publishedAt: '2026-08-03 12:00' },
        { id: `${agent.id}-v1`, label: 'v1', status: 'archived', createdAt: details.createdAt, createdBy: ACTOR, publishedAt: null },
      ],
      activity: [
        { id: `${agent.id}-act-3`, type: 'configuration_updated', message: 'Configuration updated in Agent Builder.', actor: ACTOR, timestamp: details.updatedAt },
        { id: `${agent.id}-act-2`, type: 'knowledge_assigned', message: 'Knowledge base assigned to agent.', actor: ACTOR, timestamp: '2026-08-04 14:20' },
        { id: `${agent.id}-act-1`, type: 'created', message: 'Agent created.', actor: ACTOR, timestamp: details.createdAt },
      ],
    };
  });
}

export function AgentRegistryProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<ControlPlaneAgent[]>(buildSeedAgents);

  const getAgentById = useCallback(
    (id: string): ControlPlaneAgent | null => agents.find((agent) => agent.id === id) ?? null,
    [agents],
  );

  const mutate = useCallback((id: string, updater: (agent: ControlPlaneAgent) => ControlPlaneAgent): void => {
    setAgents((prev) => prev.map((agent) => (agent.id === id ? updater(agent) : agent)));
  }, []);

  const createAgent = useCallback((input: { name: string; description: string; config?: AgentConfig }): ControlPlaneAgent => {
    const stamp = nowStamp();
    const id = `agent-${Date.now().toString(36)}`;
    const created: ControlPlaneAgent = {
      id,
      name: input.name.trim(),
      description: input.description.trim(),
      status: 'draft',
      environment: 'production',
      createdAt: stamp,
      updatedAt: stamp,
      publishedVersion: null,
      config: input.config ?? { ...DEFAULT_AGENT_CONFIG },
      versions: [{ id: `${id}-v1`, label: 'v1', status: 'draft', createdAt: stamp, createdBy: ACTOR, publishedAt: null }],
      activity: [makeActivity(id, 'created', 'Agent created.')],
    };
    setAgents((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateAgent = useCallback(
    (id: string, input: { name?: string; description?: string; config: AgentConfig }): void => {
      mutate(id, (agent) => ({
        ...agent,
        name: input.name?.trim() ?? agent.name,
        description: input.description?.trim() ?? agent.description,
        config: input.config,
        updatedAt: nowStamp(),
        versions: ensureDraftVersion(agent),
        activity: [makeActivity(id, 'configuration_updated', 'Configuration updated in Agent Builder.'), ...agent.activity],
      }));
    },
    [mutate],
  );

  const duplicateAgent = useCallback(
    (id: string): ControlPlaneAgent | null => {
      const source = agents.find((agent) => agent.id === id);
      if (!source) return null;
      const stamp = nowStamp();
      const newId = `agent-${Date.now().toString(36)}`;
      const copy: ControlPlaneAgent = {
        id: newId,
        name: `${source.name} (Copy)`,
        description: source.description,
        status: 'draft',
        environment: source.environment,
        createdAt: stamp,
        updatedAt: stamp,
        publishedVersion: null,
        config: { ...source.config },
        versions: [{ id: `${newId}-v1`, label: 'v1', status: 'draft', createdAt: stamp, createdBy: ACTOR, publishedAt: null }],
        activity: [makeActivity(newId, 'duplicated', `Duplicated from ${source.name}.`)],
      };
      setAgents((prev) => [copy, ...prev]);
      return copy;
    },
    [agents],
  );

  const publishAgent = useCallback(
    (id: string): void => {
      mutate(id, (agent) => {
        const versions = ensureDraftVersion(agent);
        const stamp = nowStamp();
        const [draft, ...rest] = versions;
        const publishedDraft: AgentVersion = { ...draft, status: 'published', publishedAt: stamp };
        const archivedRest = rest.map((version) => (version.status === 'published' ? { ...version, status: 'archived' as const } : version));
        return {
          ...agent,
          status: 'published',
          publishedVersion: publishedDraft.label,
          updatedAt: stamp,
          versions: [publishedDraft, ...archivedRest],
          activity: [makeActivity(id, 'published', `Agent published (${publishedDraft.label}).`), ...agent.activity],
        };
      });
    },
    [mutate],
  );

  const disableAgent = useCallback(
    (id: string): void => {
      mutate(id, (agent) => ({ ...agent, status: 'disabled', updatedAt: nowStamp(), activity: [makeActivity(id, 'disabled', 'Agent disabled.'), ...agent.activity] }));
    },
    [mutate],
  );

  const enableAgent = useCallback(
    (id: string): void => {
      mutate(id, (agent) => ({
        ...agent,
        status: agent.publishedVersion ? 'published' : 'draft',
        updatedAt: nowStamp(),
        activity: [makeActivity(id, 'enabled', 'Agent enabled.'), ...agent.activity],
      }));
    },
    [mutate],
  );

  const archiveAgent = useCallback(
    (id: string): void => {
      mutate(id, (agent) => ({ ...agent, status: 'archived', updatedAt: nowStamp(), activity: [makeActivity(id, 'archived', 'Agent archived.'), ...agent.activity] }));
    },
    [mutate],
  );

  const restoreAgent = useCallback(
    (id: string): void => {
      mutate(id, (agent) => ({
        ...agent,
        status: agent.publishedVersion ? 'published' : 'draft',
        updatedAt: nowStamp(),
        activity: [makeActivity(id, 'restored', 'Agent restored from archive.'), ...agent.activity],
      }));
    },
    [mutate],
  );

  const createNewVersion = useCallback(
    (id: string): void => {
      mutate(id, (agent) => {
        const stamp = nowStamp();
        const label = nextVersionLabel(agent.versions);
        const draft: AgentVersion = { id: `${agent.id}-${label}`, label, status: 'draft', createdAt: stamp, createdBy: ACTOR, publishedAt: null };
        return {
          ...agent,
          updatedAt: stamp,
          versions: [draft, ...agent.versions],
          activity: [makeActivity(id, 'version_created', `New draft version ${label} created.`), ...agent.activity],
        };
      });
    },
    [mutate],
  );

  const logActivity = useCallback(
    (id: string, type: AgentActivityType, message: string): void => {
      mutate(id, (agent) => ({ ...agent, updatedAt: nowStamp(), activity: [makeActivity(id, type, message), ...agent.activity] }));
    },
    [mutate],
  );

  const value = useMemo<AgentRegistryContextValue>(
    () => ({
      agents,
      getAgentById,
      createAgent,
      updateAgent,
      duplicateAgent,
      publishAgent,
      disableAgent,
      enableAgent,
      archiveAgent,
      restoreAgent,
      createNewVersion,
      logActivity,
    }),
    [
      agents,
      getAgentById,
      createAgent,
      updateAgent,
      duplicateAgent,
      publishAgent,
      disableAgent,
      enableAgent,
      archiveAgent,
      restoreAgent,
      createNewVersion,
      logActivity,
    ],
  );

  return <AgentRegistryContext.Provider value={value}>{children}</AgentRegistryContext.Provider>;
}

export function useAgentRegistry(): AgentRegistryContextValue {
  const context = useContext(AgentRegistryContext);
  if (!context) {
    throw new Error('useAgentRegistry must be used within an AgentRegistryProvider');
  }
  return context;
}

export function agentStatusDescriptor(status: AgentStatus): { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' } {
  switch (status) {
    case 'published':
      return { label: 'Published', variant: 'success' };
    case 'disabled':
      return { label: 'Disabled', variant: 'warning' };
    case 'error':
      return { label: 'Error', variant: 'danger' };
    case 'archived':
      return { label: 'Archived', variant: 'default' };
    case 'draft':
    default:
      return { label: 'Draft', variant: 'info' };
  }
}
