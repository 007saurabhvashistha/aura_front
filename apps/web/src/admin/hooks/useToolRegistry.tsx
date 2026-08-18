import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Tools Control Center state. Tools are referenced by stable IDs and bound to
// agents via assignedAgentIds. Data below is clearly-marked demo state and should
// be replaced by real API state when the backend is wired.

export type ToolType =
  | 'http'
  | 'webhook'
  | 'crm'
  | 'calendar'
  | 'email'
  | 'whatsapp'
  | 'database'
  | 'function';

export type ToolValidationState = 'unconfigured' | 'configured' | 'validated' | 'error';

export type ToolTestState = 'untested' | 'passed' | 'failed';

export type ToolReadiness = 'READY' | 'UNVALIDATED' | 'FAILED' | 'DISABLED';

export type ToolAuthType = 'none' | 'api_key' | 'bearer' | 'basic';

export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ToolActivityType =
  | 'created'
  | 'updated'
  | 'duplicated'
  | 'config_updated'
  | 'auth_updated'
  | 'schema_updated'
  | 'validated'
  | 'validation_failed'
  | 'tested'
  | 'test_failed'
  | 'dry_run'
  | 'enabled'
  | 'disabled'
  | 'enable_blocked'
  | 'agent_assigned'
  | 'agent_removed';

export interface ToolConfig {
  endpointUrl: string;
  method: ToolHttpMethod;
  timeoutMs: string;
  headers: string;
}

export interface ToolAuth {
  type: ToolAuthType;
  headerName: string;
  username: string;
  secret: string;
}

export interface ToolSchema {
  inputSchema: string;
  outputSchema: string;
}

export interface ToolTestResult {
  status: 'passed' | 'failed';
  latencyMs: number;
  message: string;
  requestPreview: string;
  responsePreview: string;
  ranAt: string;
}

export interface ToolActivityEntry {
  id: string;
  type: ToolActivityType;
  message: string;
  actor: string;
  timestamp: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  enabled: boolean;
  validationState: ToolValidationState;
  testState: ToolTestState;
  assignedAgentIds: string[];
  createdAt: string;
  updatedAt: string;
  config: ToolConfig;
  auth: ToolAuth;
  schema: ToolSchema;
  errors: string[];
  lastTest: ToolTestResult | null;
  activity: ToolActivityEntry[];
}

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  http: 'HTTP / API',
  webhook: 'Webhook',
  crm: 'CRM',
  calendar: 'Calendar',
  email: 'Email',
  whatsapp: 'WhatsApp',
  database: 'Database',
  function: 'Custom Function',
};

export const TOOL_AUTH_LABELS: Record<ToolAuthType, string> = {
  none: 'No authentication',
  api_key: 'API key header',
  bearer: 'Bearer token',
  basic: 'Basic auth',
};

export const TOOL_HTTP_METHODS: ToolHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface ToolRegistryContextValue {
  tools: Tool[];
  getToolById: (id: string) => Tool | null;
  createTool: (input: { name: string; description: string; type: ToolType }) => Tool;
  updateTool: (id: string, input: { name: string; description: string; type: ToolType }) => void;
  duplicateTool: (id: string) => Tool | null;
  deleteTool: (id: string) => void;
  toggleTool: (id: string, enabled: boolean) => void;
  updateConfig: (id: string, config: ToolConfig) => void;
  updateAuth: (id: string, auth: ToolAuth) => void;
  updateSchema: (id: string, schema: ToolSchema) => void;
  validateTool: (id: string) => void;
  testTool: (id: string) => void;
  dryRunTool: (id: string, sampleInput: string) => void;
  assignAgent: (toolId: string, agentId: string) => void;
  removeAgent: (toolId: string, agentId: string) => void;
}

const ToolRegistryContext = createContext<ToolRegistryContextValue | undefined>(undefined);

const ACTOR = 'Aman Ops';

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function makeActivity(toolId: string, type: ToolActivityType, message: string): ToolActivityEntry {
  return {
    id: `${toolId}-act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    actor: ACTOR,
    timestamp: nowStamp(),
  };
}

export const DEFAULT_TOOL_CONFIG: ToolConfig = {
  endpointUrl: '',
  method: 'POST',
  timeoutMs: '8000',
  headers: '',
};

export const DEFAULT_TOOL_AUTH: ToolAuth = {
  type: 'none',
  headerName: '',
  username: '',
  secret: '',
};

export const DEFAULT_TOOL_SCHEMA: ToolSchema = {
  inputSchema: '',
  outputSchema: '',
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

// A tool must declare a transport, credentials matching its auth type, and an
// input/output contract before agents are allowed to call it.
export function collectToolErrors(tool: Tool): string[] {
  const errors: string[] = [];

  if (tool.type !== 'function') {
    if (!tool.config.endpointUrl.trim()) errors.push('Endpoint URL is required.');
    else if (!isHttpUrl(tool.config.endpointUrl.trim())) errors.push('Endpoint URL must be a valid http/https URL.');
  }

  const timeout = Number(tool.config.timeoutMs);
  if (!Number.isFinite(timeout) || timeout < 100 || timeout > 60000) {
    errors.push('Timeout must be between 100 and 60000 ms.');
  }

  if (tool.config.headers.trim() && !isJsonObject(tool.config.headers.trim())) {
    errors.push('Headers must be a valid JSON object.');
  }

  if (tool.auth.type === 'api_key') {
    if (!tool.auth.headerName.trim()) errors.push('API key header name is required.');
    if (!tool.auth.secret.trim()) errors.push('API key value is required.');
  }
  if (tool.auth.type === 'bearer' && !tool.auth.secret.trim()) {
    errors.push('Bearer token is required.');
  }
  if (tool.auth.type === 'basic') {
    if (!tool.auth.username.trim()) errors.push('Basic auth username is required.');
    if (!tool.auth.secret.trim()) errors.push('Basic auth password is required.');
  }

  if (!tool.schema.inputSchema.trim()) errors.push('Input schema is required.');
  else if (!isJsonObject(tool.schema.inputSchema.trim())) errors.push('Input schema must be a valid JSON object.');

  if (!tool.schema.outputSchema.trim()) errors.push('Output schema is required.');
  else if (!isJsonObject(tool.schema.outputSchema.trim())) errors.push('Output schema must be a valid JSON object.');

  return errors;
}

function isUntouched(tool: Tool): boolean {
  return (
    !tool.config.endpointUrl.trim() &&
    !tool.config.headers.trim() &&
    tool.auth.type === 'none' &&
    !tool.schema.inputSchema.trim() &&
    !tool.schema.outputSchema.trim()
  );
}

function deriveValidation(tool: Tool): { validationState: ToolValidationState; errors: string[] } {
  const errors = collectToolErrors(tool);
  if (isUntouched(tool)) return { validationState: 'unconfigured', errors: [] };
  if (errors.length > 0) return { validationState: 'error', errors };
  return { validationState: 'validated', errors: [] };
}

function touch(tool: Tool, type: ToolActivityType, message: string): Tool {
  return {
    ...tool,
    updatedAt: nowStamp(),
    activity: [makeActivity(tool.id, type, message), ...tool.activity],
  };
}

// Changing transport, credentials, or contract invalidates the previous test so a
// stale "passed" can never keep an agent publishable.
function revalidate(tool: Tool): Tool {
  return { ...tool, ...deriveValidation(tool), testState: 'untested', lastTest: null };
}

// Centralized readiness rule shared by Tools, Agent Detail, and Agent Builder so
// publish-eligibility never drifts between surfaces.
export function getToolReadiness(tool: Tool): ToolReadiness {
  if (!tool.enabled) return 'DISABLED';
  if (tool.validationState === 'error' || tool.testState === 'failed') return 'FAILED';
  if (tool.validationState !== 'validated' || tool.testState !== 'passed') return 'UNVALIDATED';
  return 'READY';
}

export function toolReadinessReason(readiness: ToolReadiness): string {
  switch (readiness) {
    case 'READY':
      return 'Tool is validated, tested, and enabled.';
    case 'UNVALIDATED':
      return 'Tool must be validated and pass a test run.';
    case 'FAILED':
      return 'Tool configuration or last test failed.';
    case 'DISABLED':
      return 'Tool is disabled and will not be callable.';
    default:
      return '';
  }
}

export function maskToolSecret(value: string): string {
  if (!value) return 'Not set';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 2)}••••••••••${value.slice(-2)}`;
}

function seedTool(input: Omit<Tool, 'validationState' | 'errors'>): Tool {
  const base: Tool = { ...input, validationState: 'unconfigured', errors: [] };
  return { ...base, ...deriveValidation(base) };
}

const INITIAL_TOOLS: Tool[] = [
  seedTool({
    id: 'tool-crm-sync',
    name: 'CRM Contact Sync',
    description: 'Reads and updates contact records in the connected CRM.',
    type: 'crm',
    enabled: true,
    testState: 'passed',
    assignedAgentIds: ['agent-support'],
    createdAt: '2026-08-08 10:00',
    updatedAt: '2026-08-10 19:12',
    config: {
      endpointUrl: 'https://crm.internal.aura.ai/v1/contacts',
      method: 'POST',
      timeoutMs: '8000',
      headers: '{"Content-Type":"application/json"}',
    },
    auth: { type: 'api_key', headerName: 'X-API-Key', username: '', secret: 'demo_crm_key_9821' },
    schema: {
      inputSchema: '{"contactId":"string","fields":"object"}',
      outputSchema: '{"status":"string","contact":"object"}',
    },
    lastTest: {
      status: 'passed',
      latencyMs: 412,
      message: 'Simulated call succeeded.',
      requestPreview: '{"contactId":"demo-1"}',
      responsePreview: '{"status":"ok"}',
      ranAt: '2026-08-10 19:12',
    },
    activity: [
      { id: 'tool-crm-sync-act-2', type: 'tested', message: 'Test run passed in 412 ms.', actor: ACTOR, timestamp: '2026-08-10 19:12' },
      { id: 'tool-crm-sync-act-1', type: 'created', message: 'Tool created.', actor: ACTOR, timestamp: '2026-08-08 10:00' },
    ],
  }),
  seedTool({
    id: 'tool-calendar-booking',
    name: 'Calendar Booking',
    description: 'Creates and reschedules calendar events on behalf of the user.',
    type: 'calendar',
    enabled: true,
    testState: 'untested',
    assignedAgentIds: ['agent-maya'],
    createdAt: '2026-08-09 12:20',
    updatedAt: '2026-08-11 07:48',
    config: { endpointUrl: 'https://calendar.internal.aura.ai/v1/events', method: 'POST', timeoutMs: '6000', headers: '' },
    auth: { type: 'bearer', headerName: '', username: '', secret: 'demo_calendar_token_5512' },
    schema: { inputSchema: '{"userId":"string","startsAt":"string"}', outputSchema: '{"eventId":"string"}' },
    lastTest: null,
    activity: [
      { id: 'tool-calendar-booking-act-1', type: 'created', message: 'Tool created.', actor: ACTOR, timestamp: '2026-08-09 12:20' },
    ],
  }),
  seedTool({
    id: 'tool-order-lookup',
    name: 'Order Lookup API',
    description: 'HTTP tool that fetches order status from the commerce backend.',
    type: 'http',
    enabled: false,
    testState: 'failed',
    assignedAgentIds: [],
    createdAt: '2026-08-09 20:00',
    updatedAt: '2026-08-09 22:03',
    config: { endpointUrl: '', method: 'GET', timeoutMs: '8000', headers: '' },
    auth: { type: 'api_key', headerName: '', username: '', secret: '' },
    schema: { inputSchema: '{"orderId":"string"}', outputSchema: '' },
    lastTest: {
      status: 'failed',
      latencyMs: 0,
      message: 'Tool is not valid. Resolve configuration errors first.',
      requestPreview: '—',
      responsePreview: '—',
      ranAt: '2026-08-09 22:03',
    },
    activity: [
      { id: 'tool-order-lookup-act-2', type: 'test_failed', message: 'Test run failed: configuration invalid.', actor: ACTOR, timestamp: '2026-08-09 22:03' },
      { id: 'tool-order-lookup-act-1', type: 'created', message: 'Tool created.', actor: ACTOR, timestamp: '2026-08-09 20:00' },
    ],
  }),
];

export function ToolRegistryProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS);

  const getToolById = useCallback((id: string): Tool | null => tools.find((tool) => tool.id === id) ?? null, [tools]);

  const mutate = useCallback((id: string, updater: (tool: Tool) => Tool): void => {
    setTools((prev) => prev.map((tool) => (tool.id === id ? updater(tool) : tool)));
  }, []);

  const createTool = useCallback((input: { name: string; description: string; type: ToolType }): Tool => {
    const stamp = nowStamp();
    const id = `tool-${Date.now().toString(36)}`;
    const created: Tool = {
      id,
      name: input.name.trim(),
      description: input.description.trim(),
      type: input.type,
      enabled: false,
      validationState: 'unconfigured',
      testState: 'untested',
      assignedAgentIds: [],
      createdAt: stamp,
      updatedAt: stamp,
      config: { ...DEFAULT_TOOL_CONFIG },
      auth: { ...DEFAULT_TOOL_AUTH },
      schema: { ...DEFAULT_TOOL_SCHEMA },
      errors: [],
      lastTest: null,
      activity: [makeActivity(id, 'created', 'Tool created.')],
    };
    setTools((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateTool = useCallback(
    (id: string, input: { name: string; description: string; type: ToolType }): void => {
      mutate(id, (tool) =>
        touch(
          { ...tool, name: input.name.trim(), description: input.description.trim(), type: input.type },
          'updated',
          'Tool details updated.',
        ),
      );
    },
    [mutate],
  );

  const duplicateTool = useCallback(
    (id: string): Tool | null => {
      const source = tools.find((tool) => tool.id === id);
      if (!source) return null;
      const stamp = nowStamp();
      const newId = `tool-${Date.now().toString(36)}`;
      const copy: Tool = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        enabled: false,
        testState: 'untested',
        lastTest: null,
        assignedAgentIds: [],
        createdAt: stamp,
        updatedAt: stamp,
        auth: { ...source.auth, secret: '' },
        activity: [makeActivity(newId, 'duplicated', `Duplicated from ${source.name}.`)],
      };
      const next = { ...copy, ...deriveValidation(copy) };
      setTools((prev) => [next, ...prev]);
      return next;
    },
    [tools],
  );

  const deleteTool = useCallback((id: string): void => {
    setTools((prev) => prev.filter((tool) => tool.id !== id));
  }, []);

  const toggleTool = useCallback(
    (id: string, enabled: boolean): void => {
      mutate(id, (tool) => {
        if (!enabled) return touch({ ...tool, enabled: false }, 'disabled', 'Tool disabled.');
        if (tool.validationState !== 'validated') {
          return touch(tool, 'enable_blocked', 'Enable blocked: tool must be validated first.');
        }
        return touch({ ...tool, enabled: true }, 'enabled', 'Tool enabled.');
      });
    },
    [mutate],
  );

  const updateConfig = useCallback(
    (id: string, config: ToolConfig): void => {
      mutate(id, (tool) => touch(revalidate({ ...tool, config }), 'config_updated', 'Configuration updated.'));
    },
    [mutate],
  );

  const updateAuth = useCallback(
    (id: string, auth: ToolAuth): void => {
      mutate(id, (tool) => touch(revalidate({ ...tool, auth }), 'auth_updated', 'Authentication updated.'));
    },
    [mutate],
  );

  const updateSchema = useCallback(
    (id: string, schema: ToolSchema): void => {
      mutate(id, (tool) => touch(revalidate({ ...tool, schema }), 'schema_updated', 'Schema updated.'));
    },
    [mutate],
  );

  const validateTool = useCallback(
    (id: string): void => {
      mutate(id, (tool) => {
        const derived = deriveValidation(tool);
        const next = { ...tool, ...derived };
        return derived.errors.length > 0
          ? touch(next, 'validation_failed', `Validation failed with ${derived.errors.length} issue(s).`)
          : touch(next, 'validated', 'Validation passed.');
      });
    },
    [mutate],
  );

  const testTool = useCallback(
    (id: string): void => {
      mutate(id, (tool) => {
        const derived = deriveValidation(tool);
        const stamp = nowStamp();

        if (derived.validationState !== 'validated') {
          const failure: ToolTestResult = {
            status: 'failed',
            latencyMs: 0,
            message: 'Tool is not valid. Resolve configuration errors first.',
            requestPreview: '—',
            responsePreview: '—',
            ranAt: stamp,
          };
          return touch(
            { ...tool, ...derived, testState: 'failed', lastTest: failure },
            'test_failed',
            'Test run failed: configuration invalid.',
          );
        }

        const latencyMs = 180 + ((tool.name.length * 37) % 520);
        const result: ToolTestResult = {
          status: 'passed',
          latencyMs,
          message: 'Simulated call succeeded. No external request was made.',
          requestPreview: tool.schema.inputSchema,
          responsePreview: tool.schema.outputSchema,
          ranAt: stamp,
        };
        return touch(
          { ...tool, ...derived, testState: 'passed', lastTest: result },
          'tested',
          `Test run passed in ${latencyMs} ms.`,
        );
      });
    },
    [mutate],
  );

  const dryRunTool = useCallback(
    (id: string, sampleInput: string): void => {
      mutate(id, (tool) => {
        const stamp = nowStamp();
        const derived = deriveValidation(tool);
        const inputValid = isJsonObject(sampleInput.trim());

        if (derived.validationState !== 'validated' || !inputValid) {
          const failure: ToolTestResult = {
            status: 'failed',
            latencyMs: 0,
            message: inputValid
              ? 'Tool is not valid. Resolve configuration errors first.'
              : 'Sample input must be a valid JSON object.',
            requestPreview: sampleInput.trim() || '—',
            responsePreview: '—',
            ranAt: stamp,
          };
          return touch({ ...tool, ...derived, lastTest: failure }, 'dry_run', 'Dry run failed.');
        }

        const latencyMs = 140 + ((sampleInput.length * 29) % 420);
        const result: ToolTestResult = {
          status: 'passed',
          latencyMs,
          message: 'Simulated dry run completed. No external request was made.',
          requestPreview: sampleInput.trim(),
          responsePreview: tool.schema.outputSchema,
          ranAt: stamp,
        };
        return touch({ ...tool, ...derived, lastTest: result }, 'dry_run', `Dry run completed in ${latencyMs} ms.`);
      });
    },
    [mutate],
  );

  const assignAgent = useCallback(
    (toolId: string, agentId: string): void => {
      mutate(toolId, (tool) =>
        tool.assignedAgentIds.includes(agentId)
          ? tool
          : touch(
              { ...tool, assignedAgentIds: [...tool.assignedAgentIds, agentId] },
              'agent_assigned',
              'Assigned to an agent.',
            ),
      );
    },
    [mutate],
  );

  const removeAgent = useCallback(
    (toolId: string, agentId: string): void => {
      mutate(toolId, (tool) =>
        touch(
          { ...tool, assignedAgentIds: tool.assignedAgentIds.filter((id) => id !== agentId) },
          'agent_removed',
          'Removed from an agent.',
        ),
      );
    },
    [mutate],
  );

  const value = useMemo<ToolRegistryContextValue>(
    () => ({
      tools,
      getToolById,
      createTool,
      updateTool,
      duplicateTool,
      deleteTool,
      toggleTool,
      updateConfig,
      updateAuth,
      updateSchema,
      validateTool,
      testTool,
      dryRunTool,
      assignAgent,
      removeAgent,
    }),
    [
      tools,
      getToolById,
      createTool,
      updateTool,
      duplicateTool,
      deleteTool,
      toggleTool,
      updateConfig,
      updateAuth,
      updateSchema,
      validateTool,
      testTool,
      dryRunTool,
      assignAgent,
      removeAgent,
    ],
  );

  return <ToolRegistryContext.Provider value={value}>{children}</ToolRegistryContext.Provider>;
}

export function useToolRegistry(): ToolRegistryContextValue {
  const context = useContext(ToolRegistryContext);
  if (!context) {
    throw new Error('useToolRegistry must be used within a ToolRegistryProvider');
  }
  return context;
}
