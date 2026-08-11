import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  type AgentIntegrationRefs,
  type IntegrationCapability,
  type IntegrationRecord,
  type IntegrationType,
  useIntegrationRegistry,
} from '../hooks/useIntegrationRegistry';
import { useAgentRegistry, type AgentConfig } from '../hooks/useAgentRegistry';
import { useKnowledgeRegistry, getKnowledgeReadiness, knowledgeReadinessReason } from '../hooks/useKnowledgeRegistry';
import { knowledgeReadinessBadge } from '../components/statusMaps';

type StepKey =
  | 'basic'
  | 'brain'
  | 'voice'
  | 'intelligence'
  | 'knowledge'
  | 'integrations'
  | 'test'
  | 'publish';

interface BuilderStep {
  key: StepKey;
  title: string;
  helper: string;
}

interface AgentDraft {
  name: string;
  description: string;
  avatarUrl: string;
  status: 'draft' | 'test' | 'active' | 'paused';
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
  selectedLlmIntegrationId: IntegrationType | '';
  selectedVoiceIntegrationId: IntegrationType | '';
  selectedRealtimeIntegrationId: IntegrationType | '';
  selectedCallingIntegrationId: IntegrationType | '';
  testScenario: string;
  testNotes: string;
}

type TestStatus = 'idle' | 'running' | 'success' | 'error';

const MODEL_CATALOG: Record<string, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  anthropic: ['claude-3-7-sonnet', 'claude-3-5-sonnet'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
};

const VOICE_CATALOG: Record<string, { voices: string[]; languages: string[] }> = {
  cartesia: {
    voices: ['calm-female-v1', 'warm-male-v2', 'neutral-v1'],
    languages: ['en-US', 'en-IN', 'hi-IN'],
  },
  elevenlabs: {
    voices: ['rachel', 'adam', 'bella'],
    languages: ['en-US', 'en-GB'],
  },
  openai: {
    voices: ['alloy', 'verse', 'sage'],
    languages: ['en-US'],
  },
};

const STEPS: BuilderStep[] = [
  { key: 'basic', title: 'Basic', helper: 'Define identity and visibility.' },
  { key: 'brain', title: 'Brain', helper: 'Prompt, personality, and safety.' },
  { key: 'voice', title: 'Voice', helper: 'Provider, voice profile, and language.' },
  { key: 'intelligence', title: 'Intelligence', helper: 'Model and reasoning settings.' },
  { key: 'knowledge', title: 'Knowledge', helper: 'Attach docs, urls, and FAQs.' },
  { key: 'integrations', title: 'Tools & Integrations', helper: 'Connect runtime capabilities.' },
  { key: 'test', title: 'Test', helper: 'Run chat and voice checks.' },
  { key: 'publish', title: 'Publish', helper: 'Promote draft to active safely.' },
];

const INITIAL_DRAFT: AgentDraft = {
  name: '',
  description: '',
  avatarUrl: '',
  status: 'draft',
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
  selectedLlmIntegrationId: '',
  selectedVoiceIntegrationId: '',
  selectedRealtimeIntegrationId: '',
  selectedCallingIntegrationId: '',
  testScenario: '',
  testNotes: '',
};

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// Map the wizard's working draft to/from the persisted AgentConfig. Integration
// selections are excluded from config — they are owned by the Integration
// Registry and re-derived from the agent's binding when editing.
function draftToConfig(draft: AgentDraft): AgentConfig {
  const {
    name: _name,
    description: _description,
    status: _status,
    selectedLlmIntegrationId: _llm,
    selectedVoiceIntegrationId: _voice,
    selectedRealtimeIntegrationId: _realtime,
    selectedCallingIntegrationId: _calling,
    ...config
  } = draft;
  void _name;
  void _description;
  void _status;
  void _llm;
  void _voice;
  void _realtime;
  void _calling;
  return config;
}

function configToDraft(
  config: AgentConfig,
  refs: AgentIntegrationRefs | undefined,
  name: string,
  description: string,
): AgentDraft {
  return {
    ...INITIAL_DRAFT,
    ...config,
    name,
    description,
    status: 'draft',
    selectedLlmIntegrationId: refs?.intelligenceIntegrationId ?? '',
    selectedVoiceIntegrationId: refs?.voiceIntegrationId ?? '',
    selectedRealtimeIntegrationId: refs?.realtimeIntegrationId ?? '',
    selectedCallingIntegrationId: refs?.callingIntegrationId ?? '',
  };
}

function isValidNumberBetween(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

function isHttpUrl(value: string): boolean {
  if (!isNonEmpty(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function IntegrationCapabilityCard({
  title,
  integration,
}: {
  title: string;
  integration: IntegrationRecord | null;
}) {
  const isConnected = integration?.enabled && integration?.status === 'connected';

  if (!integration) {
    return (
      <div className="rounded-lg border border-admin-border p-4">
        <p className="text-sm font-semibold text-admin-text-primary">{title}</p>
        <p className="text-xs text-secondary mt-2">No integration selected.</p>
        <Link to="/admin/integrations" className="text-xs text-primary-600 mt-3 inline-block">
          Configure Integration
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-admin-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-admin-text-primary">{integration.config.provider || title}</p>
        <Badge variant={isConnected ? 'success' : integration.status === 'failed' ? 'danger' : 'warning'}>
          {isConnected ? 'Connected' : integration.status.replace('_', ' ')}
        </Badge>
      </div>
      <p className="text-xs text-secondary mt-2">Used by {integration.usedByAgents.length} agents</p>
      {!isConnected && (
        <Link to="/admin/integrations" className="text-xs text-primary-600 mt-3 inline-block">
          Configure Integration
        </Link>
      )}
    </div>
  );
}

function getCapabilityOptions(
  integrations: IntegrationRecord[],
  capability: IntegrationCapability,
): IntegrationRecord[] {
  return integrations.filter((integration) => integration.capability === capability);
}

function getIntegrationBySelectedId(
  integrations: IntegrationRecord[],
  selectedId: IntegrationType | '',
): IntegrationRecord | null {
  if (!selectedId) return null;
  return integrations.find((integration) => integration.id === selectedId) ?? null;
}

export function AgentBuilderPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<AgentDraft>(INITIAL_DRAFT);
  const [docInput, setDocInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [faqQuestionInput, setFaqQuestionInput] = useState('');
  const [faqAnswerInput, setFaqAnswerInput] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState('No test run yet.');
  const [voiceTestStatus, setVoiceTestStatus] = useState<TestStatus>('idle');
  const [voiceTestResult, setVoiceTestResult] = useState('No voice test run yet.');
  const [toolTestStatus, setToolTestStatus] = useState<TestStatus>('idle');
  const [toolTestResult, setToolTestResult] = useState('No tool execution test run yet.');

  const { integrations, agents: integrationBindings, setAgentIntegrationRefs } = useIntegrationRegistry();
  const { getAgentById, createAgent, updateAgent, publishAgent } = useAgentRegistry();
  const { knowledgeBases, assignAgent: assignKnowledgeAgent, removeAgent: removeKnowledgeAgent } = useKnowledgeRegistry();
  const navigate = useNavigate();
  const { agentId } = useParams();
  const isEditMode = Boolean(agentId);

  const [savedAgentId, setSavedAgentId] = useState<string | null>(agentId ?? null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(INITIAL_DRAFT));
  const [hydrated, setHydrated] = useState<boolean>(!agentId);
  const [showExit, setShowExit] = useState(false);

  const dirty = JSON.stringify(draft) !== savedSnapshot;

  useEffect(() => {
    if (!agentId || hydrated) return;
    const agent = getAgentById(agentId);
    if (!agent) return;
    const binding = integrationBindings.find((item) => item.id === agentId);
    const nextDraft = configToDraft(agent.config, binding?.integrationRefs, agent.name, agent.description);
    setDraft(nextDraft);
    setSavedSnapshot(JSON.stringify(nextDraft));
    setSavedAgentId(agentId);
    setHydrated(true);
  }, [agentId, hydrated, getAgentById, integrationBindings]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const currentStep = STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const llmOptions = useMemo(
    () => getCapabilityOptions(integrations, 'intelligence'),
    [integrations],
  );
  const voiceOptions = useMemo(
    () => getCapabilityOptions(integrations, 'voice'),
    [integrations],
  );
  const realtimeOptions = useMemo(
    () => getCapabilityOptions(integrations, 'realtime'),
    [integrations],
  );
  const callingOptions = useMemo(
    () => getCapabilityOptions(integrations, 'calling'),
    [integrations],
  );

  const selectedLlmIntegration = useMemo(
    () => getIntegrationBySelectedId(integrations, draft.selectedLlmIntegrationId),
    [integrations, draft.selectedLlmIntegrationId],
  );
  const selectedVoiceIntegration = useMemo(
    () => getIntegrationBySelectedId(integrations, draft.selectedVoiceIntegrationId),
    [integrations, draft.selectedVoiceIntegrationId],
  );
  const selectedRealtimeIntegration = useMemo(
    () => getIntegrationBySelectedId(integrations, draft.selectedRealtimeIntegrationId),
    [integrations, draft.selectedRealtimeIntegrationId],
  );
  const selectedCallingIntegration = useMemo(
    () => getIntegrationBySelectedId(integrations, draft.selectedCallingIntegrationId),
    [integrations, draft.selectedCallingIntegrationId],
  );

  const isConnectedIntegration = (integration: IntegrationRecord | null): boolean =>
    Boolean(integration && integration.enabled && integration.status === 'connected');

  const availableVoiceProviders = useMemo(() => {
    const connectedVoice = voiceOptions
      .filter((item) => isConnectedIntegration(item))
      .map((item) => item.config.provider);
    return [...new Set(connectedVoice)];
  }, [voiceOptions]);

  const availableLlmProviders = useMemo(() => {
    const connectedLlm = llmOptions
      .filter((item) => isConnectedIntegration(item))
      .map((item) => item.config.provider);
    return [...new Set(connectedLlm)];
  }, [llmOptions]);

  const validateStep = (step: StepKey): string[] => {
    switch (step) {
      case 'basic':
        return [
          !isNonEmpty(draft.name) ? 'Agent name is required.' : '',
          !isNonEmpty(draft.description) ? 'Description is required.' : '',
        ].filter(Boolean);
      case 'brain':
        return [
          !isNonEmpty(draft.systemPrompt) ? 'System prompt is required.' : '',
          !isNonEmpty(draft.personality) ? 'Personality is required.' : '',
          !isNonEmpty(draft.goals) ? 'Goals are required.' : '',
          !isNonEmpty(draft.restrictions) ? 'Restrictions are required.' : '',
        ].filter(Boolean);
      case 'voice': {
        const voiceProviderConfig = VOICE_CATALOG[draft.voiceProvider];
        return [
          !draft.selectedVoiceIntegrationId ? 'Select a voice integration.' : '',
          !isConnectedIntegration(selectedVoiceIntegration)
            ? 'Selected voice integration must be connected.'
            : '',
          availableVoiceProviders.length === 0 ? 'No connected voice integration. Configure Integrations first.' : '',
          !availableVoiceProviders.includes(draft.voiceProvider)
            ? 'Selected voice provider is not connected.'
            : '',
          !voiceProviderConfig ? 'Choose a supported voice provider.' : '',
          !isNonEmpty(draft.voiceName) ? 'Voice selection is required.' : '',
          !isValidNumberBetween(draft.speed, 0.5, 2.0)
            ? 'Voice speed must be between 0.5 and 2.0.'
            : '',
          !isNonEmpty(draft.tone) ? 'Tone is required.' : '',
        ].filter(Boolean);
      }
      case 'intelligence': {
        const validModels = MODEL_CATALOG[draft.llmProvider] ?? [];
        return [
          !draft.selectedLlmIntegrationId ? 'Select an intelligence integration.' : '',
          !isConnectedIntegration(selectedLlmIntegration)
            ? 'Selected intelligence integration must be connected.'
            : '',
          availableLlmProviders.length === 0 ? 'No connected LLM integration. Configure Integrations first.' : '',
          !availableLlmProviders.includes(draft.llmProvider)
            ? 'Selected LLM provider is not connected.'
            : '',
          validModels.length === 0 ? 'Choose a supported LLM provider.' : '',
          !validModels.includes(draft.model) ? 'Choose a valid model for selected provider.' : '',
          !isValidNumberBetween(draft.temperature, 0, 1.5)
            ? 'Temperature must be between 0 and 1.5.'
            : '',
        ].filter(Boolean);
      }
      case 'knowledge':
        return [
          draft.knowledgeDocuments.length === 0 &&
          draft.knowledgeUrlList.length === 0 &&
          draft.knowledgeFaqList.length === 0
            ? 'Add at least one knowledge source (document, URL, or FAQ).'
            : '',
        ].filter(Boolean);
      case 'integrations':
        return [
          !draft.selectedVoiceIntegrationId ? 'Select a voice integration.' : '',
          !isConnectedIntegration(selectedVoiceIntegration) ? 'Voice integration is not connected.' : '',
          !draft.selectedLlmIntegrationId ? 'Select an intelligence integration.' : '',
          !isConnectedIntegration(selectedLlmIntegration) ? 'Intelligence integration is not connected.' : '',
          !draft.selectedRealtimeIntegrationId ? 'Select a realtime integration.' : '',
          !isConnectedIntegration(selectedRealtimeIntegration) ? 'Realtime integration is not connected.' : '',
          draft.telephonyEnabled && !draft.selectedCallingIntegrationId
            ? 'Select a calling integration when telephony is enabled.'
            : '',
          draft.telephonyEnabled && !isConnectedIntegration(selectedCallingIntegration)
            ? 'Telephony is enabled but calling integration is not connected.'
            : '',
          draft.livekitEnabled && !isNonEmpty(draft.livekitRoomPreset)
            ? 'LiveKit room preset is required when LiveKit is enabled.'
            : '',
          draft.cartesiaEnabled && !isNonEmpty(draft.cartesiaVoiceProfile)
            ? 'Cartesia voice profile is required when Cartesia is enabled.'
            : '',
          draft.customApiEnabled && !isHttpUrl(draft.customApiBaseUrl)
            ? 'Custom API base URL must be a valid http/https URL.'
            : '',
          draft.telephonyEnabled && !isNonEmpty(draft.telephonyNumber)
            ? 'Telephony number is required when telephony is enabled.'
            : '',
        ].filter(Boolean);
      case 'test':
        return [!isNonEmpty(draft.testScenario) ? 'Define at least one test scenario.' : ''].filter(Boolean);
      case 'publish': {
        const readinessChecks = [
          validateStep('basic').length === 0,
          validateStep('brain').length === 0,
          validateStep('voice').length === 0,
          validateStep('intelligence').length === 0,
          validateStep('knowledge').length === 0,
          validateStep('integrations').length === 0,
          validateStep('test').length === 0,
        ];
        return [
          readinessChecks.every(Boolean) ? '' : 'Resolve pending validation issues before publishing.',
        ].filter(Boolean);
      }
      default:
        return [];
    }
  };

  const completion = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);
  const stepErrors = useMemo(() => validateStep(currentStep.key), [currentStep.key, draft, integrations]);

  const publishReadiness = useMemo(
    () => {
      const assignedKbs = savedAgentId ? knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(savedAgentId)) : [];
      const knowledgeReady = assignedKbs.every((kb) => getKnowledgeReadiness(kb) === 'READY');
      return [
        { label: 'Basic profile complete', ok: validateStep('basic').length === 0 },
        { label: 'Brain prompt configured', ok: validateStep('brain').length === 0 },
        { label: 'Voice setup valid', ok: validateStep('voice').length === 0 },
        { label: 'Intelligence setup valid', ok: validateStep('intelligence').length === 0 },
        { label: 'Knowledge source attached', ok: validateStep('knowledge').length === 0 },
        { label: 'Assigned knowledge bases ready', ok: knowledgeReady },
        { label: 'Integrations validated', ok: validateStep('integrations').length === 0 },
        { label: 'Test scenario defined', ok: validateStep('test').length === 0 },
      ];
    },
    [draft, integrations, knowledgeBases, savedAgentId],
  );

  const publishReady = publishReadiness.every((item) => item.ok);

  const persist = ({ publish }: { publish: boolean }): string => {
    const config = draftToConfig(draft);
    const refs: AgentIntegrationRefs = {
      intelligenceIntegrationId: draft.selectedLlmIntegrationId || null,
      voiceIntegrationId: draft.selectedVoiceIntegrationId || null,
      realtimeIntegrationId: draft.selectedRealtimeIntegrationId || null,
      callingIntegrationId: draft.selectedCallingIntegrationId || null,
    };
    let id = savedAgentId;
    if (!id) {
      const created = createAgent({ name: draft.name, description: draft.description, config });
      id = created.id;
      setSavedAgentId(id);
    } else {
      updateAgent(id, { name: draft.name, description: draft.description, config });
    }
    setAgentIntegrationRefs(id, refs, draft.name);
    if (publish) publishAgent(id);
    setSavedSnapshot(JSON.stringify(draft));
    return id;
  };

  const handleSaveDraft = () => {
    const id = persist({ publish: false });
    if (!isEditMode) navigate(`/admin/agents/${id}/edit`, { replace: true });
  };

  const handlePublish = () => {
    if (!publishReady) return;
    const id = persist({ publish: true });
    navigate(`/admin/agents/${id}`);
  };

  const handleExit = () => {
    if (dirty) {
      setShowExit(true);
      return;
    }
    navigate('/admin/agents');
  };

  const modelsForProvider = MODEL_CATALOG[draft.llmProvider] ?? [];
  const voiceProviderConfig = VOICE_CATALOG[draft.voiceProvider];
  const voicesForProvider = voiceProviderConfig?.voices ?? [];
  const languagesForProvider = voiceProviderConfig?.languages ?? [];

  const apiContractPreview = useMemo(
    () => ({
      basic: {
        name: draft.name,
        description: draft.description,
        status: draft.status,
        avatarUrl: draft.avatarUrl,
      },
      brain: {
        systemPrompt: draft.systemPrompt,
        personality: draft.personality,
        goals: draft.goals,
        restrictions: draft.restrictions,
        conversationRules: draft.conversationRules,
      },
      voice: {
        provider: draft.voiceProvider,
        voice: draft.voiceName,
        language: draft.language,
        speed: Number(draft.speed),
        tone: draft.tone,
      },
      intelligence: {
        provider: draft.llmProvider,
        model: draft.model,
        temperature: Number(draft.temperature),
        contextWindow: draft.contextWindow,
      },
      knowledge: {
        documents: draft.knowledgeDocuments,
        urls: draft.knowledgeUrlList,
        faqs: draft.knowledgeFaqList,
      },
      integrationRefs: {
        intelligenceIntegrationId: draft.selectedLlmIntegrationId || null,
        voiceIntegrationId: draft.selectedVoiceIntegrationId || null,
        realtimeIntegrationId: draft.selectedRealtimeIntegrationId || null,
        callingIntegrationId: draft.telephonyEnabled ? draft.selectedCallingIntegrationId || null : null,
      },
      integrations: {
        livekit: draft.livekitEnabled
          ? { roomPreset: draft.livekitRoomPreset }
          : null,
        cartesia: draft.cartesiaEnabled
          ? { voiceProfile: draft.cartesiaVoiceProfile }
          : null,
        telephony: draft.telephonyEnabled
          ? { number: draft.telephonyNumber }
          : null,
        webhookUrl: draft.webhookUrl,
        customApi: draft.customApiEnabled
          ? { baseUrl: draft.customApiBaseUrl, hasKey: isNonEmpty(draft.customApiKey) }
          : null,
      },
    }),
    [draft],
  );

  const builderSummary = useMemo(
    () => [
      {
        label: 'Voice',
        value: selectedVoiceIntegration
          ? `${selectedVoiceIntegration.config.provider || selectedVoiceIntegration.name}`
          : 'Not configured',
        ok: isConnectedIntegration(selectedVoiceIntegration),
      },
      {
        label: 'Intelligence',
        value: selectedLlmIntegration
          ? `${selectedLlmIntegration.config.provider || selectedLlmIntegration.name}`
          : 'Not configured',
        ok: isConnectedIntegration(selectedLlmIntegration),
      },
      {
        label: 'Realtime',
        value: selectedRealtimeIntegration
          ? `${selectedRealtimeIntegration.config.provider || selectedRealtimeIntegration.name}`
          : 'Not configured',
        ok: isConnectedIntegration(selectedRealtimeIntegration),
      },
      {
        label: 'Knowledge',
        value: `${draft.knowledgeDocuments.length + draft.knowledgeUrlList.length + draft.knowledgeFaqList.length} source(s)`,
        ok:
          draft.knowledgeDocuments.length > 0 ||
          draft.knowledgeUrlList.length > 0 ||
          draft.knowledgeFaqList.length > 0,
      },
      {
        label: 'Tools',
        value: `${[draft.livekitEnabled, draft.cartesiaEnabled, draft.telephonyEnabled, draft.customApiEnabled].filter(Boolean).length} enabled`,
        ok: [draft.livekitEnabled, draft.cartesiaEnabled, draft.telephonyEnabled, draft.customApiEnabled].some(Boolean),
      },
    ],
    [
      draft.cartesiaEnabled,
      draft.customApiEnabled,
      draft.knowledgeDocuments.length,
      draft.knowledgeFaqList.length,
      draft.knowledgeUrlList.length,
      draft.livekitEnabled,
      draft.telephonyEnabled,
      selectedLlmIntegration,
      selectedRealtimeIntegration,
      selectedVoiceIntegration,
    ],
  );

  const update = <K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (stepErrors.length > 0) return;
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };
  const prevStep = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  const addKnowledgeDocument = () => {
    if (!isNonEmpty(docInput)) return;
    setDraft((prev) => ({ ...prev, knowledgeDocuments: [...prev.knowledgeDocuments, docInput.trim()] }));
    setDocInput('');
  };

  const addKnowledgeUrl = () => {
    if (!isHttpUrl(urlInput)) return;
    setDraft((prev) => ({ ...prev, knowledgeUrlList: [...prev.knowledgeUrlList, urlInput.trim()] }));
    setUrlInput('');
  };

  const addFaq = () => {
    if (!isNonEmpty(faqQuestionInput) || !isNonEmpty(faqAnswerInput)) return;
    setDraft((prev) => ({
      ...prev,
      knowledgeFaqList: [
        ...prev.knowledgeFaqList,
        { question: faqQuestionInput.trim(), answer: faqAnswerInput.trim() },
      ],
    }));
    setFaqQuestionInput('');
    setFaqAnswerInput('');
  };

  const removeDocument = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      knowledgeDocuments: prev.knowledgeDocuments.filter((_, idx) => idx !== index),
    }));
  };

  const removeUrl = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      knowledgeUrlList: prev.knowledgeUrlList.filter((_, idx) => idx !== index),
    }));
  };

  const removeFaq = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      knowledgeFaqList: prev.knowledgeFaqList.filter((_, idx) => idx !== index),
    }));
  };

  const runTextTest = () => {
    if (!isNonEmpty(testMessage)) {
      setTestStatus('error');
      setTestResult('Enter a text message to run test conversation.');
      return;
    }
    if (validateStep('brain').length > 0 || validateStep('intelligence').length > 0) {
      setTestStatus('error');
      setTestResult('Configure Brain and Intelligence steps before text testing.');
      return;
    }

    setTestStatus('running');
    setTestResult('Running simulated text conversation...');

    setTimeout(() => {
      setTestStatus('success');
      setTestResult(
        `Simulated response from ${draft.model}: Intent parsed, policy checks passed, and response generated with ${draft.tone} tone.`,
      );
    }, 650);
  };

  const runVoiceTest = () => {
    if (validateStep('voice').length > 0) {
      setVoiceTestStatus('error');
      setVoiceTestResult('Voice step has validation errors. Resolve them before running voice test.');
      return;
    }
    if (!isConnectedIntegration(selectedVoiceIntegration) || !isConnectedIntegration(selectedRealtimeIntegration)) {
      setVoiceTestStatus('error');
      setVoiceTestResult('Connected voice and realtime integrations are required for voice test.');
      return;
    }

    setVoiceTestStatus('running');
    setVoiceTestResult('Running simulated voice synthesis and stream check...');

    setTimeout(() => {
      setVoiceTestStatus('success');
      setVoiceTestResult(
        `Voice test successful: ${draft.voiceProvider}/${draft.voiceName || 'default'} in ${draft.language} at speed ${draft.speed}.`,
      );
    }, 700);
  };

  const runToolExecutionTest = () => {
    const enabledTools = [
      draft.customApiEnabled ? 'Custom API' : '',
      isConnectedIntegration(selectedRealtimeIntegration) ? 'LiveKit' : '',
      isConnectedIntegration(selectedVoiceIntegration) ? 'Cartesia' : '',
      draft.telephonyEnabled && isConnectedIntegration(selectedCallingIntegration) ? 'Telephony' : '',
    ].filter(Boolean);

    if (enabledTools.length === 0) {
      setToolTestStatus('error');
      setToolTestResult('Enable at least one integration/tool before tool execution test.');
      return;
    }
    if (draft.customApiEnabled && !isHttpUrl(draft.customApiBaseUrl)) {
      setToolTestStatus('error');
      setToolTestResult('Custom API base URL is invalid.');
      return;
    }

    setToolTestStatus('running');
    setToolTestResult('Executing simulated tool chain...');

    setTimeout(() => {
      setToolTestStatus('success');
      setToolTestResult(`Tool execution test passed for: ${enabledTools.join(', ')}.`);
    }, 650);
  };

  const handleVoiceIntegrationSelection = (integrationId: IntegrationType | '') => {
    update('selectedVoiceIntegrationId', integrationId);
    const integration = getIntegrationBySelectedId(integrations, integrationId);
    if (!integration) return;
    const provider = integration.config.provider;
    if (!provider) return;
    update('voiceProvider', provider);
    const providerConfig = VOICE_CATALOG[provider];
    update('voiceName', integration.config.voiceId || providerConfig?.voices[0] || '');
    update('language', integration.config.language || providerConfig?.languages[0] || 'en-US');
  };

  const handleLlmIntegrationSelection = (integrationId: IntegrationType | '') => {
    update('selectedLlmIntegrationId', integrationId);
    const integration = getIntegrationBySelectedId(integrations, integrationId);
    if (!integration) return;
    const provider = integration.config.provider;
    if (!provider) return;
    update('llmProvider', provider);
    update('model', integration.config.model || MODEL_CATALOG[provider]?.[0] || '');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? `Edit Agent${draft.name ? ` · ${draft.name}` : ''}` : 'Create Agent'}
        description="Configure identity, behavior, integrations, and launch readiness from a single control workspace."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Agents', href: '/admin/agents' },
          { label: isEditMode ? 'Edit Agent' : 'Create Agent' },
        ]}
        actions={[
          { label: 'Save Draft', variant: 'secondary', onClick: handleSaveDraft },
          { label: 'Exit', variant: 'ghost', onClick: handleExit },
        ]}
      />

      <div className="admin-detail-statusbar">
        <Badge variant={isEditMode ? 'info' : 'default'}>{isEditMode ? 'Edit mode' : 'Create mode'}</Badge>
        <span className="admin-cell-sub">{savedAgentId ? `Agent ID: ${savedAgentId}` : 'Not saved yet'}</span>
        <Badge variant={publishReady ? 'success' : 'warning'}>{publishReady ? 'Publish ready' : 'Publish blocked'}</Badge>
        <div className="admin-detail-statusbar-actions">
          <Badge variant={dirty ? 'warning' : 'success'}>{dirty ? 'Unsaved changes' : 'All changes saved'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">

      <div className="rounded-xl border border-admin-border bg-admin-bg-primary p-4">
        <div className="space-y-4">
          <div className="admin-step-strip flex gap-4 overflow-x-auto">
            {STEPS.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`admin-step-item min-w-max text-left ${index === stepIndex ? 'is-active' : ''}`}
                onClick={() => setStepIndex(index)}
              >
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-secondary mt-1">{step.helper}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="w-full h-1.5 bg-admin-bg-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-primary-500" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <Card title={`Configure ${currentStep.title}`} description={currentStep.helper}>
        <div className="space-y-5">
          {stepErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">Resolve before continuing</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-700 space-y-1">
                {stepErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {currentStep.key === 'basic' && (
            <>
              <Input label="Agent Name" placeholder="Aura Concierge" value={draft.name} onChange={(e) => update('name', e.target.value)} />
              <Input label="Description" placeholder="High-empathy voice assistant for customer onboarding." value={draft.description} onChange={(e) => update('description', e.target.value)} />
              <Input label="Avatar URL" placeholder="https://..." value={draft.avatarUrl} onChange={(e) => update('avatarUrl', e.target.value)} />
              <div>
                <label className="text-sm font-medium text-admin-text-primary">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) => update('status', e.target.value as AgentDraft['status'])}
                  className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="test">Test</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </>
          )}

          {currentStep.key === 'brain' && (
            <>
              <div>
                <label className="text-sm font-medium text-admin-text-primary">System Prompt</label>
                <textarea
                  rows={5}
                  className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  value={draft.systemPrompt}
                  onChange={(e) => update('systemPrompt', e.target.value)}
                  placeholder="You are Aura..."
                />
                <p className="text-xs text-secondary mt-2">Use this as the primary instruction contract for backend execution.</p>
              </div>
              <Input label="Personality" placeholder="Calm, supportive, concise" value={draft.personality} onChange={(e) => update('personality', e.target.value)} />
              <Input label="Goals" placeholder="Maximize successful first-call resolution" value={draft.goals} onChange={(e) => update('goals', e.target.value)} />
              <Input label="Restrictions" placeholder="Do not provide legal or medical diagnosis" value={draft.restrictions} onChange={(e) => update('restrictions', e.target.value)} />
              <Input label="Conversation Rules" placeholder="Always confirm intent before tool call" value={draft.conversationRules} onChange={(e) => update('conversationRules', e.target.value)} />
            </>
          )}

          {currentStep.key === 'voice' && (
            <>
              <div className="rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
                <p className="text-sm font-semibold text-admin-text-primary">Voice integration availability</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {voiceOptions.map((integration) => {
                    const selectable = isConnectedIntegration(integration);
                    return (
                      <div key={integration.id} className="rounded-lg border border-admin-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-admin-text-primary">{integration.config.provider || integration.name}</p>
                          <Badge variant={selectable ? 'success' : 'warning'}>
                            {selectable ? 'Connected' : integration.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-secondary mt-2">{integration.usedByAgents.length} agents using</p>
                        {!selectable && (
                          <Link to="/admin/integrations" className="text-xs text-primary-600 mt-2 inline-block">
                            Configure Integration
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Voice Integration Ref</label>
                  <select
                    value={draft.selectedVoiceIntegrationId}
                    onChange={(e) => handleVoiceIntegrationSelection(e.target.value as IntegrationType | '')}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="">Select integration</option>
                    {voiceOptions.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.id} - {integration.config.provider || integration.name} ({integration.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Voice Provider</label>
                  <select
                    value={draft.voiceProvider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      const providerConfig = VOICE_CATALOG[provider];
                      update('voiceProvider', provider);
                      update('voiceName', providerConfig?.voices[0] ?? '');
                      update('language', providerConfig?.languages[0] ?? 'en-US');
                    }}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    {availableVoiceProviders.length === 0 && <option value="">No connected provider</option>}
                    {availableVoiceProviders.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Language</label>
                  <select
                    value={draft.language}
                    onChange={(e) => update('language', e.target.value)}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                    disabled={availableVoiceProviders.length === 0 || !isConnectedIntegration(selectedVoiceIntegration)}
                  >
                    {languagesForProvider.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Speed" placeholder="1.0" value={draft.speed} onChange={(e) => update('speed', e.target.value)} />
                <Input label="Tone" placeholder="empathetic" value={draft.tone} onChange={(e) => update('tone', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-admin-text-primary">Voice Selection</label>
                <select
                  value={draft.voiceName}
                  onChange={(e) => update('voiceName', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  disabled={availableVoiceProviders.length === 0 || !isConnectedIntegration(selectedVoiceIntegration)}
                >
                  {voicesForProvider.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {currentStep.key === 'intelligence' && (
            <>
              <div className="rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
                <p className="text-sm font-semibold text-admin-text-primary">Intelligence integration availability</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {llmOptions.map((integration) => {
                    const selectable = isConnectedIntegration(integration);
                    return (
                      <div key={integration.id} className="rounded-lg border border-admin-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-admin-text-primary">{integration.config.provider || integration.name}</p>
                          <Badge variant={selectable ? 'success' : 'warning'}>
                            {selectable ? 'Connected' : integration.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {!selectable && (
                          <Link to="/admin/integrations" className="text-xs text-primary-600 mt-2 inline-block">
                            Configure Integration
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Intelligence Integration Ref</label>
                  <select
                    value={draft.selectedLlmIntegrationId}
                    onChange={(e) => handleLlmIntegrationSelection(e.target.value as IntegrationType | '')}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="">Select integration</option>
                    {llmOptions.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.id} - {integration.config.provider || integration.name} ({integration.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">LLM Provider</label>
                  <select
                    value={draft.llmProvider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      update('llmProvider', provider);
                      update('model', MODEL_CATALOG[provider]?.[0] ?? '');
                    }}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    {availableLlmProviders.length === 0 && <option value="">No connected provider</option>}
                    {availableLlmProviders.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Model</label>
                  <select
                    value={draft.model}
                    onChange={(e) => update('model', e.target.value)}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                    disabled={availableLlmProviders.length === 0 || !isConnectedIntegration(selectedLlmIntegration)}
                  >
                    {modelsForProvider.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Temperature" placeholder="0.6" value={draft.temperature} onChange={(e) => update('temperature', e.target.value)} />
              </div>
              <Input label="Context Settings" placeholder="long" value={draft.contextWindow} onChange={(e) => update('contextWindow', e.target.value)} />
            </>
          )}

          {currentStep.key === 'knowledge' && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin-text-primary">Knowledge Bases</p>
                {!savedAgentId ? (
                  <div className="rounded-md border border-admin-border px-3 py-3">
                    <p className="text-sm text-secondary">Save the agent first to attach knowledge bases.</p>
                    <Button variant="secondary" size="sm" onClick={handleSaveDraft} className="mt-2">Save Draft</Button>
                  </div>
                ) : (
                  <>
                    {knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(savedAgentId)).length === 0 ? (
                      <p className="text-sm text-secondary">No knowledge bases attached yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {knowledgeBases
                          .filter((kb) => kb.assignedAgentIds.includes(savedAgentId))
                          .map((kb) => {
                            const readiness = getKnowledgeReadiness(kb);
                            const badge = knowledgeReadinessBadge(readiness);
                            return (
                              <div key={kb.id} className="flex items-start justify-between gap-3 rounded-md border border-admin-border px-3 py-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-admin-text-primary">{kb.name}</p>
                                    <Badge variant={badge.variant}>{badge.label}</Badge>
                                  </div>
                                  {readiness !== 'READY' && (
                                    <p className="text-xs text-secondary mt-1">
                                      {knowledgeReadinessReason(readiness)}{' '}
                                      <Link to={`/admin/knowledge/${kb.id}`} className="text-primary-600">Configure Knowledge</Link>
                                    </p>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeKnowledgeAgent(kb.id, savedAgentId)}>Remove</Button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {knowledgeBases.filter((kb) => !kb.assignedAgentIds.includes(savedAgentId)).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Available</p>
                        {knowledgeBases
                          .filter((kb) => !kb.assignedAgentIds.includes(savedAgentId))
                          .map((kb) => {
                            const badge = knowledgeReadinessBadge(getKnowledgeReadiness(kb));
                            return (
                              <div key={kb.id} className="flex items-center justify-between gap-3 rounded-md border border-admin-border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-admin-text-primary">{kb.name}</p>
                                  <Badge variant={badge.variant}>{badge.label}</Badge>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => assignKnowledgeAgent(kb.id, savedAgentId)}>Add</Button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin-text-primary">Documents</p>
                <div className="flex gap-2">
                  <Input placeholder="pricing.pdf" value={docInput} onChange={(e) => setDocInput(e.target.value)} className="flex-1" />
                  <Button variant="secondary" onClick={addKnowledgeDocument}>Add</Button>
                </div>
                {draft.knowledgeDocuments.length === 0 ? (
                  <p className="text-sm text-secondary">No documents added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.knowledgeDocuments.map((document, index) => (
                      <div key={`${document}-${index}`} className="flex items-center justify-between rounded-md border border-admin-border px-3 py-2">
                        <p className="text-sm text-admin-text-primary">{document}</p>
                        <Button variant="ghost" size="sm" onClick={() => removeDocument(index)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin-text-primary">URLs</p>
                <div className="flex gap-2">
                  <Input placeholder="https://docs.company.com/faq" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1" />
                  <Button variant="secondary" onClick={addKnowledgeUrl}>Add</Button>
                </div>
                {draft.knowledgeUrlList.length === 0 ? (
                  <p className="text-sm text-secondary">No URLs added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.knowledgeUrlList.map((url, index) => (
                      <div key={`${url}-${index}`} className="flex items-center justify-between rounded-md border border-admin-border px-3 py-2">
                        <p className="text-sm text-admin-text-primary">{url}</p>
                        <Button variant="ghost" size="sm" onClick={() => removeUrl(index)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin-text-primary">FAQs</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Input placeholder="Question" value={faqQuestionInput} onChange={(e) => setFaqQuestionInput(e.target.value)} />
                  <Input placeholder="Answer" value={faqAnswerInput} onChange={(e) => setFaqAnswerInput(e.target.value)} />
                </div>
                <Button variant="secondary" onClick={addFaq}>Add FAQ</Button>
                {draft.knowledgeFaqList.length === 0 ? (
                  <p className="text-sm text-secondary">No FAQs added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.knowledgeFaqList.map((faq, index) => (
                      <div key={`${faq.question}-${index}`} className="rounded-md border border-admin-border px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-admin-text-primary">Q: {faq.question}</p>
                            <p className="text-sm text-secondary mt-1">A: {faq.answer}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFaq(index)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input label="Knowledge Source Labels" placeholder="billing-kb, onboarding-kb" value={draft.knowledgeSources} onChange={(e) => update('knowledgeSources', e.target.value)} />
            </>
          )}

          {currentStep.key === 'integrations' && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <IntegrationCapabilityCard title="Voice" integration={selectedVoiceIntegration} />
                <IntegrationCapabilityCard title="Intelligence" integration={selectedLlmIntegration} />
                <IntegrationCapabilityCard title="Realtime" integration={selectedRealtimeIntegration} />
                <IntegrationCapabilityCard title="Calling" integration={selectedCallingIntegration} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Realtime Integration Ref</label>
                  <select
                    value={draft.selectedRealtimeIntegrationId}
                    onChange={(e) => update('selectedRealtimeIntegrationId', e.target.value as IntegrationType | '')}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="">Select integration</option>
                    {realtimeOptions.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.id} - {integration.config.provider || integration.name} ({integration.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Calling Integration Ref</label>
                  <select
                    value={draft.selectedCallingIntegrationId}
                    onChange={(e) => update('selectedCallingIntegrationId', e.target.value as IntegrationType | '')}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="">Select integration</option>
                    {callingOptions.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.id} - {integration.config.provider || integration.name} ({integration.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between px-4 py-3 border border-admin-border rounded-lg">
                  <span className="text-sm font-medium text-admin-text-primary">LiveKit</span>
                  <input
                    type="checkbox"
                    checked={draft.livekitEnabled}
                    onChange={(e) => update('livekitEnabled', e.target.checked)}
                    disabled={!isConnectedIntegration(selectedRealtimeIntegration)}
                  />
                </label>
                <label className="flex items-center justify-between px-4 py-3 border border-admin-border rounded-lg">
                  <span className="text-sm font-medium text-admin-text-primary">Cartesia</span>
                  <input
                    type="checkbox"
                    checked={draft.cartesiaEnabled}
                    onChange={(e) => update('cartesiaEnabled', e.target.checked)}
                    disabled={!isConnectedIntegration(selectedVoiceIntegration)}
                  />
                </label>
                <label className="flex items-center justify-between px-4 py-3 border border-admin-border rounded-lg">
                  <span className="text-sm font-medium text-admin-text-primary">Telephony</span>
                  <input
                    type="checkbox"
                    checked={draft.telephonyEnabled}
                    onChange={(e) => update('telephonyEnabled', e.target.checked)}
                    disabled={!isConnectedIntegration(selectedCallingIntegration)}
                  />
                </label>
                <label className="flex items-center justify-between px-4 py-3 border border-admin-border rounded-lg">
                  <span className="text-sm font-medium text-admin-text-primary">Custom API Tools</span>
                  <input type="checkbox" checked={draft.customApiEnabled} onChange={(e) => update('customApiEnabled', e.target.checked)} />
                </label>
              </div>
              <Input label="Webhook URL" placeholder="https://api.yourcompany.com/hooks/aura" value={draft.webhookUrl} onChange={(e) => update('webhookUrl', e.target.value)} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="LiveKit Room Preset"
                  placeholder="support-room"
                  value={draft.livekitRoomPreset}
                  onChange={(e) => update('livekitRoomPreset', e.target.value)}
                />
                <Input
                  label="Cartesia Voice Profile"
                  placeholder="balanced"
                  value={draft.cartesiaVoiceProfile}
                  onChange={(e) => update('cartesiaVoiceProfile', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Telephony Number"
                  placeholder="+1-555-000-0000"
                  value={draft.telephonyNumber}
                  onChange={(e) => update('telephonyNumber', e.target.value)}
                />
                <Input
                  label="Custom API Base URL"
                  placeholder="https://api.partner.com/v1"
                  value={draft.customApiBaseUrl}
                  onChange={(e) => update('customApiBaseUrl', e.target.value)}
                />
              </div>
              <Input
                label="Custom API Credential"
                type="password"
                placeholder="Enter API key"
                value={draft.customApiKey}
                onChange={(e) => update('customApiKey', e.target.value)}
              />
            </>
          )}

          {currentStep.key === 'test' && (
            <>
              <Input label="Test Scenario" placeholder="Customer asks for refund policy and order lookup" value={draft.testScenario} onChange={(e) => update('testScenario', e.target.value)} />
              <div>
                <label className="text-sm font-medium text-admin-text-primary">Testing Notes</label>
                <textarea
                  rows={5}
                  className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  value={draft.testNotes}
                  onChange={(e) => update('testNotes', e.target.value)}
                  placeholder="Log tool calls, failed turns, and response quality."
                />
              </div>

              <div className="space-y-3 rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
                <p className="text-sm font-semibold text-admin-text-primary">Text conversation test</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a user message to simulate"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={runTextTest} isLoading={testStatus === 'running'}>
                    Run
                  </Button>
                </div>
                <p
                  className={`text-sm ${
                    testStatus === 'error'
                      ? 'text-red-600'
                      : testStatus === 'success'
                        ? 'text-green-700'
                        : 'text-secondary'
                  }`}
                >
                  {testResult}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-admin-border p-4">
                  <p className="text-sm font-semibold text-admin-text-primary">Voice test</p>
                  <p className="text-xs text-secondary mt-1">Checks provider, language, and stream readiness.</p>
                  <Button className="mt-3" variant="secondary" onClick={runVoiceTest} isLoading={voiceTestStatus === 'running'}>
                    Run Voice Test
                  </Button>
                  <p
                    className={`text-sm mt-3 ${
                      voiceTestStatus === 'error'
                        ? 'text-red-600'
                        : voiceTestStatus === 'success'
                          ? 'text-green-700'
                          : 'text-secondary'
                    }`}
                  >
                    {voiceTestResult}
                  </p>
                </div>

                <div className="rounded-lg border border-admin-border p-4">
                  <p className="text-sm font-semibold text-admin-text-primary">Tool execution test</p>
                  <p className="text-xs text-secondary mt-1">Validates integration hooks and runtime tool path.</p>
                  <Button className="mt-3" variant="secondary" onClick={runToolExecutionTest} isLoading={toolTestStatus === 'running'}>
                    Run Tool Test
                  </Button>
                  <p
                    className={`text-sm mt-3 ${
                      toolTestStatus === 'error'
                        ? 'text-red-600'
                        : toolTestStatus === 'success'
                          ? 'text-green-700'
                          : 'text-secondary'
                    }`}
                  >
                    {toolTestResult}
                  </p>
                </div>
              </div>
            </>
          )}

          {currentStep.key === 'publish' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
                <p className="text-sm font-semibold text-admin-text-primary">Release lane</p>
                <p className="text-xs text-secondary mt-1">Draft → Test → Publish → Active/Paused rollout with audit trail.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-admin-border p-4">
                  <p className="text-xs text-secondary">Agent</p>
                  <p className="text-sm font-semibold text-admin-text-primary mt-1">{draft.name || 'Untitled agent'}</p>
                </div>
                <div className="rounded-lg border border-admin-border p-4">
                  <p className="text-xs text-secondary">Target status</p>
                  <p className="text-sm font-semibold text-admin-text-primary mt-1">{draft.status}</p>
                </div>
              </div>

              <div className="rounded-lg border border-admin-border p-4">
                <p className="text-sm font-semibold text-admin-text-primary">Integration mapping</p>
                <div className="space-y-2 mt-3 text-sm">
                  <p>Voice: {selectedVoiceIntegration ? `${selectedVoiceIntegration.name} (${selectedVoiceIntegration.id})` : 'Not selected'}</p>
                  <p>LLM: {selectedLlmIntegration ? `${selectedLlmIntegration.name} (${selectedLlmIntegration.id})` : 'Not selected'}</p>
                  <p>Realtime: {selectedRealtimeIntegration ? `${selectedRealtimeIntegration.name} (${selectedRealtimeIntegration.id})` : 'Not selected'}</p>
                  <p>Calling: {draft.telephonyEnabled ? (selectedCallingIntegration ? `${selectedCallingIntegration.name} (${selectedCallingIntegration.id})` : 'Not selected') : 'Not required'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-admin-border p-4">
                <p className="text-sm font-semibold text-admin-text-primary">Publish readiness</p>
                <div className="space-y-2 mt-3">
                  {publishReadiness.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <p className="text-sm text-admin-text-primary">{item.label}</p>
                      <span className={`text-xs font-semibold ${item.ok ? 'text-green-700' : 'text-amber-700'}`}>
                        {item.ok ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
                <p className="text-sm font-semibold text-admin-text-primary">API contract preview</p>
                <pre className="mt-3 text-xs text-admin-text-primary overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(apiContractPreview, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-3 border-t border-admin-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={prevStep} disabled={isFirstStep}>
          Back
        </Button>
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
          {isLastStep ? (
            <Button variant="primary" onClick={handlePublish} disabled={!publishReady}>Publish Agent</Button>
          ) : (
            <Button variant="primary" onClick={nextStep} disabled={stepErrors.length > 0}>
              Continue
            </Button>
          )}
        </div>
      </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card title="Agent Configuration" description="Live contract status across connected systems.">
            <div className="space-y-3">
              {builderSummary.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3 border-b border-admin-border pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-admin-text-primary">{item.label}</p>
                    <p className="text-xs text-secondary mt-1">{item.value}</p>
                  </div>
                  <Badge variant={item.ok ? 'success' : 'warning'}>{item.ok ? 'Ready' : 'Pending'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Publishing" description="Overall readiness for launch.">
            <div className="flex items-center justify-between">
              <p className="text-sm text-admin-text-primary">Completion</p>
              <p className="text-lg font-bold text-admin-text-primary">{completion}%</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-admin-bg-tertiary">
              <div className="h-full bg-primary-500" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-admin-text-primary">Publish state</p>
              <Badge variant={publishReady ? 'success' : 'warning'}>{publishReady ? 'Ready' : 'Blocked'}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleSaveDraft}>Save Draft</Button>
              <Button variant="primary" className="flex-1" onClick={isLastStep ? handlePublish : nextStep} disabled={isLastStep && !publishReady}>
                {isLastStep ? 'Publish' : 'Continue'}
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={showExit}
        title="Discard unsaved changes?"
        description="You have unsaved changes. Leaving now will discard them. This builder uses demo persistence only."
        confirmLabel="Discard & Exit"
        cancelLabel="Keep Editing"
        destructive
        onCancel={() => setShowExit(false)}
        onConfirm={() => {
          setShowExit(false);
          navigate('/admin/agents');
        }}
      />
    </div>
  );
}
