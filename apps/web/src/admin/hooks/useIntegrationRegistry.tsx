import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type IntegrationType = 'llm' | 'voice' | 'livekit' | 'telephony';

export type IntegrationCapability = 'intelligence' | 'voice' | 'realtime' | 'calling';

export type IntegrationStatus =
  | 'empty'
  | 'not_configured'
  | 'configured'
  | 'testing'
  | 'connected'
  | 'failed'
  | 'disabled'
  | 'validation_error';

export interface AgentUsage {
  agentName: string;
  voice: string;
  llm: string;
  realtime: string;
}

export interface IntegrationConfig {
  provider: string;
  model: string;
  apiKey: string;
  voiceId: string;
  language: string;
  livekitUrl: string;
  livekitApiKey: string;
  livekitSecret: string;
  telephonyNumber: string;
  telephonyCredentialId: string;
  telephonyCredentialSecret: string;
}

export interface IntegrationRecord {
  id: IntegrationType;
  capability: IntegrationCapability;
  name: string;
  category: 'Intelligence' | 'Voice' | 'Realtime' | 'Calling';
  status: IntegrationStatus;
  enabled: boolean;
  lastTested: string;
  usedByAgents: AgentUsage[];
  config: IntegrationConfig;
  errors: string[];
}

export interface AgentIntegrationRefs {
  intelligenceIntegrationId: IntegrationType | null;
  voiceIntegrationId: IntegrationType | null;
  realtimeIntegrationId: IntegrationType | null;
  callingIntegrationId: IntegrationType | null;
}

export interface AgentBinding {
  id: string;
  name: string;
  integrationRefs: AgentIntegrationRefs;
}

interface IntegrationRegistryContextValue {
  integrations: IntegrationRecord[];
  agents: AgentBinding[];
  getIntegrationsByCapability: (capability: IntegrationCapability) => IntegrationRecord[];
  getIntegrationById: (id: IntegrationType) => IntegrationRecord | null;
  toggleIntegration: (id: IntegrationType, enabled: boolean) => void;
  saveIntegration: (id: IntegrationType, config: IntegrationConfig) => void;
  testIntegration: (id: IntegrationType, config: IntegrationConfig) => void;
  resetIntegration: (id: IntegrationType) => void;
  isIntegrationSelectable: (id: IntegrationType) => boolean;
  assignAgentToIntegration: (integrationId: IntegrationType, agentId: string) => void;
  removeAgentFromIntegration: (integrationId: IntegrationType, agentId: string) => void;
  setAgentIntegrationRefs: (agentId: string, refs: AgentIntegrationRefs, name?: string) => void;
}

const IntegrationRegistryContext = createContext<IntegrationRegistryContextValue | undefined>(undefined);

const INITIAL_INTEGRATIONS: Omit<IntegrationRecord, 'usedByAgents'>[] = [
  {
    id: 'llm',
    capability: 'intelligence',
    name: 'LLM Provider',
    category: 'Intelligence',
    status: 'not_configured',
    enabled: true,
    lastTested: 'Never',
    config: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKey: '',
      voiceId: '',
      language: '',
      livekitUrl: '',
      livekitApiKey: '',
      livekitSecret: '',
      telephonyNumber: '',
      telephonyCredentialId: '',
      telephonyCredentialSecret: '',
    },
    errors: [],
  },
  {
    id: 'voice',
    capability: 'voice',
    name: 'Voice (Cartesia)',
    category: 'Voice',
    status: 'connected',
    enabled: true,
    lastTested: '2026-08-10 21:05',
    config: {
      provider: 'cartesia',
      model: '',
      apiKey: 'sk_cartesia_live_1234567891',
      voiceId: 'calm-female-v1',
      language: 'en-US',
      livekitUrl: '',
      livekitApiKey: '',
      livekitSecret: '',
      telephonyNumber: '',
      telephonyCredentialId: '',
      telephonyCredentialSecret: '',
    },
    errors: [],
  },
  {
    id: 'livekit',
    capability: 'realtime',
    name: 'LiveKit Realtime',
    category: 'Realtime',
    status: 'failed',
    enabled: true,
    lastTested: '2026-08-10 20:52',
    config: {
      provider: 'livekit',
      model: '',
      apiKey: '',
      voiceId: '',
      language: '',
      livekitUrl: 'https://your-livekit-url.livekit.cloud',
      livekitApiKey: '',
      livekitSecret: '',
      telephonyNumber: '',
      telephonyCredentialId: '',
      telephonyCredentialSecret: '',
    },
    errors: ['Missing API key and secret.'],
  },
  {
    id: 'telephony',
    capability: 'calling',
    name: 'Telephony',
    category: 'Calling',
    status: 'disabled',
    enabled: false,
    lastTested: 'Never',
    config: {
      provider: 'twilio',
      model: '',
      apiKey: '',
      voiceId: '',
      language: '',
      livekitUrl: '',
      livekitApiKey: '',
      livekitSecret: '',
      telephonyNumber: '',
      telephonyCredentialId: '',
      telephonyCredentialSecret: '',
    },
    errors: [],
  },
];

const INITIAL_AGENT_BINDINGS: AgentBinding[] = [
  {
    id: 'agent-maya',
    name: 'Maya',
    integrationRefs: {
      intelligenceIntegrationId: 'llm',
      voiceIntegrationId: 'voice',
      realtimeIntegrationId: 'livekit',
      callingIntegrationId: null,
    },
  },
  {
    id: 'agent-aura-companion',
    name: 'Aura Companion',
    integrationRefs: {
      intelligenceIntegrationId: 'llm',
      voiceIntegrationId: 'voice',
      realtimeIntegrationId: 'livekit',
      callingIntegrationId: null,
    },
  },
  {
    id: 'agent-support',
    name: 'Support Agent',
    integrationRefs: {
      intelligenceIntegrationId: 'llm',
      voiceIntegrationId: 'voice',
      realtimeIntegrationId: 'livekit',
      callingIntegrationId: null,
    },
  },
  {
    id: 'agent-phone-assistant',
    name: 'Phone Assistant',
    integrationRefs: {
      intelligenceIntegrationId: null,
      voiceIntegrationId: null,
      realtimeIntegrationId: null,
      callingIntegrationId: null,
    },
  },
];

function formatNow(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function normalizeStatusAfterToggle(current: Omit<IntegrationRecord, 'usedByAgents'>, enabled: boolean): IntegrationStatus {
  if (!enabled) return 'disabled';
  if (current.status === 'disabled') return 'empty';
  return current.status;
}

function deriveUnconfiguredStatus(record: Omit<IntegrationRecord, 'usedByAgents'>): IntegrationStatus {
  if (!record.enabled) return 'disabled';

  const keyFields: string[] = [];
  if (record.id === 'llm') {
    keyFields.push(record.config.provider, record.config.model, record.config.apiKey);
  }
  if (record.id === 'voice') {
    keyFields.push(record.config.provider, record.config.apiKey, record.config.voiceId, record.config.language);
  }
  if (record.id === 'livekit') {
    keyFields.push(record.config.livekitUrl, record.config.livekitApiKey, record.config.livekitSecret);
  }
  if (record.id === 'telephony') {
    keyFields.push(
      record.config.provider,
      record.config.telephonyNumber,
      record.config.telephonyCredentialId,
      record.config.telephonyCredentialSecret,
    );
  }

  const hasAnyValue = keyFields.some((field) => field.trim().length > 0);
  return hasAnyValue ? 'not_configured' : 'empty';
}

function validateIntegration(record: Omit<IntegrationRecord, 'usedByAgents'>): string[] {
  if (!record.enabled) return [];

  const errors: string[] = [];
  if (record.id === 'llm') {
    if (!record.config.provider.trim()) errors.push('Provider is required.');
    if (!record.config.model.trim()) errors.push('Model is required.');
    if (!record.config.apiKey.trim()) errors.push('API key is required.');
  }

  if (record.id === 'voice') {
    if (!record.config.apiKey.trim()) errors.push('Cartesia API key is required.');
    if (!record.config.voiceId.trim()) errors.push('Voice selection is required.');
    if (!record.config.language.trim()) errors.push('Language is required.');
  }

  if (record.id === 'livekit') {
    if (!record.config.livekitUrl.trim()) errors.push('LiveKit URL is required.');
    if (!record.config.livekitApiKey.trim()) errors.push('LiveKit API key is required.');
    if (!record.config.livekitSecret.trim()) errors.push('LiveKit secret is required.');
  }

  if (record.id === 'telephony') {
    if (!record.config.provider.trim()) errors.push('Telephony provider is required.');
    if (!record.config.telephonyNumber.trim()) errors.push('Number is required.');
    if (!record.config.telephonyCredentialId.trim()) errors.push('Credential ID is required.');
    if (!record.config.telephonyCredentialSecret.trim()) errors.push('Credential secret is required.');
  }

  return errors;
}

function getIntegrationLabelByCapability(
  capability: IntegrationCapability,
  integrationId: IntegrationType | null,
  integrations: Omit<IntegrationRecord, 'usedByAgents'>[],
): string {
  if (!integrationId) return 'Not assigned';
  const integration = integrations.find((item) => item.id === integrationId);
  if (!integration) return 'Not assigned';

  if (capability === 'intelligence') {
    return `${integration.config.provider || 'Provider'} / ${integration.config.model || 'Model'}`;
  }
  if (capability === 'voice') {
    return `${integration.config.provider || 'Provider'} / ${integration.config.voiceId || 'Voice'}`;
  }
  if (capability === 'realtime') {
    return `${integration.config.provider || 'Provider'} / ${integration.name}`;
  }
  return `${integration.config.provider || 'Provider'} / ${integration.config.telephonyNumber || 'Number'}`;
}

function buildUsageForIntegration(
  integrationId: IntegrationType,
  integrations: Omit<IntegrationRecord, 'usedByAgents'>[],
  bindings: AgentBinding[],
): AgentUsage[] {
  return bindings
    .filter((binding) => {
      const refs = binding.integrationRefs;
      return (
        refs.intelligenceIntegrationId === integrationId ||
        refs.voiceIntegrationId === integrationId ||
        refs.realtimeIntegrationId === integrationId ||
        refs.callingIntegrationId === integrationId
      );
    })
    .map((binding) => ({
      agentName: binding.name,
      llm: getIntegrationLabelByCapability('intelligence', binding.integrationRefs.intelligenceIntegrationId, integrations),
      voice: getIntegrationLabelByCapability('voice', binding.integrationRefs.voiceIntegrationId, integrations),
      realtime: getIntegrationLabelByCapability('realtime', binding.integrationRefs.realtimeIntegrationId, integrations),
    }));
}

export function maskSecret(value: string): string {
  if (!value) return 'Not set';
  if (value.length <= 6) return `${value[0] ?? ''}••••`;
  return `${value.slice(0, 3)}••••••••••••••••${value.slice(-2)}`;
}

export function IntegrationRegistryProvider({ children }: { children: ReactNode }) {
  const [rawIntegrations, setRawIntegrations] = useState<Omit<IntegrationRecord, 'usedByAgents'>[]>(
    INITIAL_INTEGRATIONS,
  );
  const [agents, setAgents] = useState<AgentBinding[]>(INITIAL_AGENT_BINDINGS);

  const integrations = useMemo<IntegrationRecord[]>(
    () =>
      rawIntegrations.map((integration) => ({
        ...integration,
        usedByAgents: buildUsageForIntegration(integration.id, rawIntegrations, agents),
      })),
    [rawIntegrations, agents],
  );

  const getIntegrationsByCapability = (capability: IntegrationCapability): IntegrationRecord[] =>
    integrations.filter((integration) => integration.capability === capability);

  const getIntegrationById = (id: IntegrationType): IntegrationRecord | null =>
    integrations.find((integration) => integration.id === id) ?? null;

  const updateIntegration = (
    id: IntegrationType,
    updater: (current: Omit<IntegrationRecord, 'usedByAgents'>) => Omit<IntegrationRecord, 'usedByAgents'>,
  ): void => {
    setRawIntegrations((prev) => prev.map((integration) => (integration.id === id ? updater(integration) : integration)));
  };

  const toggleIntegration = (id: IntegrationType, enabled: boolean): void => {
    updateIntegration(id, (current) => {
      const status = normalizeStatusAfterToggle(current, enabled);
      return {
        ...current,
        enabled,
        status,
        errors: enabled ? current.errors : [],
      };
    });
  };

  const saveIntegration = (id: IntegrationType, config: IntegrationConfig): void => {
    updateIntegration(id, (current) => {
      const draft = { ...current, config };

      if (!current.enabled) {
        return {
          ...current,
          config,
          status: 'disabled',
          errors: [],
        };
      }

      const errors = validateIntegration(draft);
      if (errors.length > 0) {
        return {
          ...current,
          config,
          status: 'validation_error',
          errors,
        };
      }

      return {
        ...current,
        config,
        status: 'configured',
        errors: [],
      };
    });
  };

  const testIntegration = (id: IntegrationType, config: IntegrationConfig): void => {
    const integration = rawIntegrations.find((item) => item.id === id);
    if (!integration) return;

    const draft = { ...integration, config };

    if (!draft.enabled) {
      updateIntegration(id, (current) => ({ ...current, status: 'disabled', errors: [] }));
      return;
    }

    const errors = validateIntegration(draft);
    if (errors.length > 0) {
      updateIntegration(id, (current) => ({
        ...current,
        config,
        status: 'validation_error',
        errors,
      }));
      return;
    }

    updateIntegration(id, (current) => ({ ...current, config, status: 'testing', errors: [] }));

    setTimeout(() => {
      updateIntegration(id, (current) => {
        const shouldFail =
          current.config.apiKey.toLowerCase().includes('fail') ||
          current.config.livekitApiKey.toLowerCase().includes('fail') ||
          current.config.livekitSecret.toLowerCase().includes('fail') ||
          current.config.telephonyCredentialSecret.toLowerCase().includes('fail');

        return {
          ...current,
          status: shouldFail ? 'failed' : 'connected',
          lastTested: formatNow(),
          errors: shouldFail ? ['Connection test failed. Check credentials and endpoint.'] : [],
        };
      });
    }, 900);
  };

  const resetIntegration = (id: IntegrationType): void => {
    updateIntegration(id, (current) => ({
      ...current,
      status: deriveUnconfiguredStatus(current),
      errors: [],
      lastTested: current.status === 'testing' ? 'Never' : current.lastTested,
    }));
  };

  const isIntegrationSelectable = (id: IntegrationType): boolean => {
    const integration = rawIntegrations.find((item) => item.id === id);
    if (!integration) return false;
    return integration.enabled && integration.status === 'connected';
  };

  const assignAgentToIntegration = (integrationId: IntegrationType, agentId: string): void => {
    const integration = rawIntegrations.find((item) => item.id === integrationId);
    if (!integration) return;

    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id !== agentId) return agent;

        if (integration.capability === 'intelligence') {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, intelligenceIntegrationId: integrationId },
          };
        }
        if (integration.capability === 'voice') {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, voiceIntegrationId: integrationId },
          };
        }
        if (integration.capability === 'realtime') {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, realtimeIntegrationId: integrationId },
          };
        }
        return {
          ...agent,
          integrationRefs: { ...agent.integrationRefs, callingIntegrationId: integrationId },
        };
      }),
    );
  };

  const removeAgentFromIntegration = (integrationId: IntegrationType, agentId: string): void => {
    const integration = rawIntegrations.find((item) => item.id === integrationId);
    if (!integration) return;

    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id !== agentId) return agent;

        if (integration.capability === 'intelligence' && agent.integrationRefs.intelligenceIntegrationId === integrationId) {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, intelligenceIntegrationId: null },
          };
        }
        if (integration.capability === 'voice' && agent.integrationRefs.voiceIntegrationId === integrationId) {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, voiceIntegrationId: null },
          };
        }
        if (integration.capability === 'realtime' && agent.integrationRefs.realtimeIntegrationId === integrationId) {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, realtimeIntegrationId: null },
          };
        }
        if (integration.capability === 'calling' && agent.integrationRefs.callingIntegrationId === integrationId) {
          return {
            ...agent,
            integrationRefs: { ...agent.integrationRefs, callingIntegrationId: null },
          };
        }
        return agent;
      }),
    );
  };

  const setAgentIntegrationRefs = (agentId: string, refs: AgentIntegrationRefs, name?: string): void => {
    setAgents((prev) => {
      const exists = prev.some((agent) => agent.id === agentId);
      if (exists) {
        return prev.map((agent) =>
          agent.id === agentId ? { ...agent, name: name ?? agent.name, integrationRefs: { ...refs } } : agent,
        );
      }
      return [...prev, { id: agentId, name: name ?? agentId, integrationRefs: { ...refs } }];
    });
  };

  const value = useMemo<IntegrationRegistryContextValue>(
    () => ({
      integrations,
      agents,
      getIntegrationsByCapability,
      getIntegrationById,
      toggleIntegration,
      saveIntegration,
      testIntegration,
      resetIntegration,
      isIntegrationSelectable,
      assignAgentToIntegration,
      removeAgentFromIntegration,
      setAgentIntegrationRefs,
    }),
    [integrations, agents],
  );

  return <IntegrationRegistryContext.Provider value={value}>{children}</IntegrationRegistryContext.Provider>;
}

export function useIntegrationRegistry(): IntegrationRegistryContextValue {
  const context = useContext(IntegrationRegistryContext);
  if (!context) {
    throw new Error('useIntegrationRegistry must be used within IntegrationRegistryProvider');
  }
  return context;
}
