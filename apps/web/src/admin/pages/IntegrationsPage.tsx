import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import {
  type AgentBinding,
  maskSecret,
  type IntegrationConfig,
  type IntegrationStatus,
  type IntegrationType,
  useIntegrationRegistry,
} from '../hooks/useIntegrationRegistry';

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; badge: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' }
> = {
  empty: { label: 'Empty', badge: 'default' },
  not_configured: { label: 'Not Configured', badge: 'warning' },
  configured: { label: 'Configured', badge: 'info' },
  testing: { label: 'Testing', badge: 'teal' },
  connected: { label: 'Connected', badge: 'success' },
  failed: { label: 'Failed', badge: 'danger' },
  disabled: { label: 'Disabled', badge: 'default' },
  validation_error: { label: 'Validation Error', badge: 'danger' },
};

function getStatusBadge(status: IntegrationStatus) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.badge}>{meta.label}</Badge>;
}

export function IntegrationsPage() {
  const {
    integrations,
    agents,
    getIntegrationById,
    toggleIntegration,
    saveIntegration,
    testIntegration,
    resetIntegration,
    assignAgentToIntegration,
    removeAgentFromIntegration,
  } = useIntegrationRegistry();

  const [selectedId, setSelectedId] = useState<IntegrationType | null>(null);
  const [configDraft, setConfigDraft] = useState<IntegrationConfig | null>(null);
  const [showAgentsFor, setShowAgentsFor] = useState<IntegrationType | null>(null);
  const [agentToAssign, setAgentToAssign] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIntegration = useMemo(
    () => (selectedId ? getIntegrationById(selectedId) : null),
    [getIntegrationById, selectedId],
  );

  const selectedAgentsIntegration = useMemo(
    () => (showAgentsFor ? getIntegrationById(showAgentsFor) : null),
    [getIntegrationById, showAgentsFor],
  );

  const candidateAgents = useMemo<AgentBinding[]>(() => {
    if (!selectedIntegration) return [];
    const assignedNames = new Set(selectedIntegration.usedByAgents.map((usage) => usage.agentName));
    return agents.filter((agent) => !assignedNames.has(agent.name));
  }, [agents, selectedIntegration]);

  const statusCount = useMemo(() => {
    const countMap: Record<IntegrationStatus, number> = {
      empty: 0,
      not_configured: 0,
      configured: 0,
      testing: 0,
      connected: 0,
      failed: 0,
      disabled: 0,
      validation_error: 0,
    };
    integrations.forEach((integration) => {
      countMap[integration.status] += 1;
    });
    return countMap;
  }, [integrations]);

  const connectedCount = integrations.filter((integration) => integration.status === 'connected').length;
  const enabledCount = integrations.filter((integration) => integration.enabled).length;
  const failedCount = integrations.filter((integration) => integration.status === 'failed').length;

  const filteredIntegrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return integrations;

    return integrations.filter((integration) => {
      const searchable = [
        integration.name,
        integration.category,
        integration.capability,
        integration.config.provider,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [integrations, searchQuery]);

  const connectedIntegrations = filteredIntegrations.filter(
    (integration) => integration.enabled && integration.status === 'connected',
  );
  const pendingIntegrations = filteredIntegrations.filter(
    (integration) => !(integration.enabled && integration.status === 'connected'),
  );

  const openIntegration = (id: IntegrationType) => {
    const integration = getIntegrationById(id);
    if (!integration) return;
    setSelectedId(id);
    setConfigDraft(integration.config);
    setAgentToAssign('');
  };

  const closeIntegrationModal = () => {
    setSelectedId(null);
    setConfigDraft(null);
    setAgentToAssign('');
  };

  const updateDraft = (key: keyof IntegrationConfig, value: string) => {
    setConfigDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveCurrentIntegration = () => {
    if (!selectedId || !configDraft) return;
    saveIntegration(selectedId, configDraft);
  };

  const testCurrentIntegration = () => {
    if (!selectedId || !configDraft) return;
    testIntegration(selectedId, configDraft);
  };

  const assignAgent = () => {
    if (!selectedIntegration || !agentToAssign) return;
    assignAgentToIntegration(selectedIntegration.id, agentToAssign);
    setAgentToAssign('');
  };

  const unassignAgent = (integrationId: IntegrationType, agentName: string) => {
    const matchedAgent = agents.find((agent) => agent.name === agentName);
    if (!matchedAgent) return;

    const confirmed = window.confirm(`Remove ${agentName} from this integration?`);
    if (!confirmed) return;

    removeAgentFromIntegration(integrationId, matchedAgent.id);
  };

  const selectedContractPreview = useMemo(() => {
    if (!selectedIntegration) return null;

    const config = selectedIntegration.config;
    if (selectedIntegration.id === 'llm') {
      return {
        id: selectedIntegration.id,
        capability: selectedIntegration.capability,
        provider: config.provider,
        status: selectedIntegration.status,
        config: {
          model: config.model,
          apiKey: maskSecret(config.apiKey),
        },
      };
    }

    if (selectedIntegration.id === 'voice') {
      return {
        id: selectedIntegration.id,
        capability: selectedIntegration.capability,
        provider: config.provider,
        status: selectedIntegration.status,
        config: {
          voiceId: config.voiceId,
          language: config.language,
          apiKey: maskSecret(config.apiKey),
        },
      };
    }

    if (selectedIntegration.id === 'livekit') {
      return {
        id: selectedIntegration.id,
        capability: selectedIntegration.capability,
        provider: config.provider,
        status: selectedIntegration.status,
        config: {
          url: config.livekitUrl,
          apiKey: maskSecret(config.livekitApiKey),
          secret: maskSecret(config.livekitSecret),
        },
      };
    }

    return {
      id: selectedIntegration.id,
      capability: selectedIntegration.capability,
      provider: config.provider,
      status: selectedIntegration.status,
      config: {
        number: config.telephonyNumber,
        credentialId: maskSecret(config.telephonyCredentialId),
        credentialSecret: maskSecret(config.telephonyCredentialSecret),
      },
    };
  }, [selectedIntegration]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect infrastructure providers that power agent intelligence, voice, realtime, and telephony flows."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Integrations' }]}
        actions={[
          { label: 'Export Matrix', variant: 'secondary' },
          { label: 'Add Integration', variant: 'primary' },
        ]}
      />

      <div className="rounded-xl border border-admin-border bg-admin-bg-primary p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h3 className="text-base font-semibold text-admin-text-primary">Integration Marketplace</h3>
            <p className="text-sm text-secondary mt-1">Search providers, inspect adoption, and configure runtime credentials.</p>
          </div>
          <div className="w-full md:w-[360px]">
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Connected</p>
          <p className="text-2xl font-bold text-admin-text-primary mt-2">{connectedCount}</p>
          <p className="text-xs text-secondary font-medium mt-2">Ready for production usage</p>
        </Card>
        <Card variant="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Enabled</p>
          <p className="text-2xl font-bold text-admin-text-primary mt-2">{enabledCount}</p>
          <p className="text-xs text-secondary font-medium mt-2">Active integrations</p>
        </Card>
        <Card variant="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Failed Tests</p>
          <p className="text-2xl font-bold text-admin-text-primary mt-2">{failedCount}</p>
          <p className="text-xs text-secondary font-medium mt-2">Requires intervention</p>
        </Card>
        <Card variant="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Agent Links</p>
          <p className="text-2xl font-bold text-admin-text-primary mt-2">
            {integrations.reduce((sum, integration) => sum + integration.usedByAgents.length, 0)}
          </p>
          <p className="text-xs text-secondary font-medium mt-2">Integration-agent mappings</p>
        </Card>
      </div>

      <Card title="State Coverage" description="Mandatory integration lifecycle states implemented.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(STATUS_META) as IntegrationStatus[]).map((status) => (
            <div key={status} className="rounded-lg border border-admin-border p-3">
              <div className="flex items-center justify-between">
                {getStatusBadge(status)}
                <span className="text-xs font-semibold text-admin-text-primary">{statusCount[status]}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-admin-text-primary">Connected</h3>
          <span className="text-xs text-secondary">{connectedIntegrations.length} integrations</span>
        </div>

        {connectedIntegrations.length === 0 ? (
          <EmptyState
            title="No connected integrations"
            description="Configure a provider and run connectivity tests to enable agent usage."
          />
        ) : (
          <div className="space-y-2">
            {connectedIntegrations.map((integration) => (
              <div key={integration.id} className="rounded-xl border border-admin-border bg-admin-bg-primary p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <p className="text-base font-semibold text-admin-text-primary">{integration.name}</p>
                      {getStatusBadge(integration.status)}
                    </div>
                    <p className="mt-1 text-sm text-secondary">{integration.category}</p>
                    <p className="mt-2 text-xs text-secondary">Provider: {integration.config.provider || 'Not set'}</p>
                    <button
                      className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                      onClick={() => setShowAgentsFor(integration.id)}
                    >
                      {integration.usedByAgents.length} agent{integration.usedByAgents.length === 1 ? '' : 's'} using this
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openIntegration(integration.id)}>
                      Configure
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resetIntegration(integration.id)}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Card title="Available / Needs Attention" description="Providers pending connection, validation, or enablement.">
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[940px]">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Last Tested</th>
                <th>Used by Agents</th>
                <th>Enable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingIntegrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-secondary">
                    All filtered integrations are connected.
                  </td>
                </tr>
              ) : (
                pendingIntegrations.map((integration) => (
                  <tr key={integration.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-admin-text-primary">{integration.name}</p>
                        <p className="text-xs text-secondary">{integration.category}</p>
                      </div>
                    </td>
                    <td className="text-sm text-admin-text-primary">{integration.config.provider || 'Not set'}</td>
                    <td>{getStatusBadge(integration.status)}</td>
                    <td className="text-sm text-secondary">{integration.lastTested}</td>
                    <td>
                      <button
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        onClick={() => setShowAgentsFor(integration.id)}
                      >
                        Used by {integration.usedByAgents.length} Agent{integration.usedByAgents.length === 1 ? '' : 's'}
                      </button>
                    </td>
                    <td>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={integration.enabled}
                          onChange={(event) => toggleIntegration(integration.id, event.target.checked)}
                        />
                        <div className="w-11 h-6 bg-admin-border rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openIntegration(integration.id)}>
                          Open
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resetIntegration(integration.id)}>
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        isOpen={Boolean(selectedIntegration && configDraft)}
        onClose={closeIntegrationModal}
        title={selectedIntegration ? `${selectedIntegration.name} Configuration` : 'Integration'}
        description="Save, validate, and test provider configuration before promoting to connected state."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={closeIntegrationModal}>
              Close
            </Button>
            <Button variant="secondary" onClick={saveCurrentIntegration}>
              Save & Validate
            </Button>
            <Button variant="primary" onClick={testCurrentIntegration}>
              Test Connection
            </Button>
          </div>
        }
      >
        {selectedIntegration && configDraft && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card variant="metric">
                <p className="text-xs text-secondary">Provider</p>
                <p className="text-sm font-semibold text-admin-text-primary mt-1">{selectedIntegration.config.provider || 'Not set'}</p>
              </Card>
              <Card variant="metric">
                <p className="text-xs text-secondary">Status</p>
                <div className="mt-2">{getStatusBadge(selectedIntegration.status)}</div>
              </Card>
              <Card variant="metric">
                <p className="text-xs text-secondary">Last Tested</p>
                <p className="text-sm font-semibold text-admin-text-primary mt-1">{selectedIntegration.lastTested}</p>
              </Card>
              <Card variant="metric">
                <p className="text-xs text-secondary">Used by Agents</p>
                <button
                  className="text-sm font-semibold text-primary-600 mt-1"
                  onClick={() => setShowAgentsFor(selectedIntegration.id)}
                >
                  {selectedIntegration.usedByAgents.length} linked
                </button>
              </Card>
            </div>

            <div className="rounded-lg border border-admin-border px-4 py-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-admin-text-primary">Enable Integration</span>
                <input
                  type="checkbox"
                  checked={selectedIntegration.enabled}
                  onChange={(event) => toggleIntegration(selectedIntegration.id, event.target.checked)}
                />
              </label>
            </div>

            {selectedIntegration.id === 'llm' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Provider</label>
                  <select
                    value={configDraft.provider}
                    onChange={(event) => updateDraft('provider', event.target.value)}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="openai">openai</option>
                    <option value="anthropic">anthropic</option>
                    <option value="google">google</option>
                  </select>
                </div>
                <Input
                  label="Model"
                  value={configDraft.model}
                  onChange={(event) => updateDraft('model', event.target.value)}
                  placeholder="gpt-4.1-mini"
                />
                <Input
                  label="API Key"
                  type="password"
                  value={configDraft.apiKey}
                  onChange={(event) => updateDraft('apiKey', event.target.value)}
                  placeholder="sk-..."
                />
              </div>
            )}

            {selectedIntegration.id === 'voice' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-admin-text-primary">Provider</label>
                  <select
                    value={configDraft.provider}
                    onChange={(event) => updateDraft('provider', event.target.value)}
                    className="mt-2 w-full px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                  >
                    <option value="cartesia">cartesia</option>
                  </select>
                </div>
                <Input
                  label="Voice ID"
                  value={configDraft.voiceId}
                  onChange={(event) => updateDraft('voiceId', event.target.value)}
                  placeholder="calm-female-v1"
                />
                <Input
                  label="Language"
                  value={configDraft.language}
                  onChange={(event) => updateDraft('language', event.target.value)}
                  placeholder="en-US"
                />
                <Input
                  label="API Key"
                  type="password"
                  value={configDraft.apiKey}
                  onChange={(event) => updateDraft('apiKey', event.target.value)}
                  placeholder="sk-..."
                />
              </div>
            )}

            {selectedIntegration.id === 'livekit' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="LiveKit URL"
                  value={configDraft.livekitUrl}
                  onChange={(event) => updateDraft('livekitUrl', event.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="API Key"
                  type="password"
                  value={configDraft.livekitApiKey}
                  onChange={(event) => updateDraft('livekitApiKey', event.target.value)}
                  placeholder="LK..."
                />
                <Input
                  label="API Secret"
                  type="password"
                  value={configDraft.livekitSecret}
                  onChange={(event) => updateDraft('livekitSecret', event.target.value)}
                  placeholder="secret"
                />
              </div>
            )}

            {selectedIntegration.id === 'telephony' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Provider"
                  value={configDraft.provider}
                  onChange={(event) => updateDraft('provider', event.target.value)}
                  placeholder="twilio"
                />
                <Input
                  label="Number"
                  value={configDraft.telephonyNumber}
                  onChange={(event) => updateDraft('telephonyNumber', event.target.value)}
                  placeholder="+1-555-000-0000"
                />
                <Input
                  label="Credential ID"
                  value={configDraft.telephonyCredentialId}
                  onChange={(event) => updateDraft('telephonyCredentialId', event.target.value)}
                  placeholder="AC..."
                />
                <Input
                  label="Credential Secret"
                  type="password"
                  value={configDraft.telephonyCredentialSecret}
                  onChange={(event) => updateDraft('telephonyCredentialSecret', event.target.value)}
                  placeholder="token"
                />
              </div>
            )}

            <div className="rounded-lg border border-admin-border p-4 bg-admin-bg-tertiary">
              <p className="text-sm font-semibold text-admin-text-primary">Masked credentials</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-secondary">API Key</p>
                  <p className="text-sm font-semibold text-admin-text-primary">{maskSecret(configDraft.apiKey)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">LiveKit Secret</p>
                  <p className="text-sm font-semibold text-admin-text-primary">{maskSecret(configDraft.livekitSecret)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Telephony Credential ID</p>
                  <p className="text-sm font-semibold text-admin-text-primary">{maskSecret(configDraft.telephonyCredentialId)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Telephony Credential Secret</p>
                  <p className="text-sm font-semibold text-admin-text-primary">{maskSecret(configDraft.telephonyCredentialSecret)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-admin-border p-4">
              <p className="text-sm font-semibold text-admin-text-primary">Agent binding</p>
              <p className="text-xs text-secondary mt-1">Bind agents by stable integration ID.</p>

              <div className="flex gap-2 mt-3">
                <select
                  value={agentToAssign}
                  onChange={(event) => setAgentToAssign(event.target.value)}
                  className="flex-1 px-4 py-2 border border-admin-border rounded-lg bg-admin-bg-primary text-admin-text-primary"
                >
                  <option value="">Select agent to assign</option>
                  {candidateAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={assignAgent} disabled={!agentToAssign}>
                  Assign Agent
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {selectedIntegration.usedByAgents.length === 0 ? (
                  <div className="rounded-lg border border-admin-border p-3 text-sm text-secondary">
                    No agents assigned
                  </div>
                ) : (
                  selectedIntegration.usedByAgents.map((usage) => (
                    <div key={usage.agentName} className="rounded-lg border border-admin-border p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-admin-text-primary">{usage.agentName}</p>
                        <p className="text-xs text-secondary mt-1">LLM: {usage.llm}</p>
                        <p className="text-xs text-secondary">Voice: {usage.voice}</p>
                        <p className="text-xs text-secondary">Realtime: {usage.realtime}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unassignAgent(selectedIntegration.id, usage.agentName)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedIntegration.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">Validation issues</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-red-700 space-y-1">
                  {selectedIntegration.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedContractPreview && (
              <div className="rounded-lg border border-admin-border p-4">
                <p className="text-sm font-semibold text-admin-text-primary">Contract Preview</p>
                <pre className="mt-2 text-xs text-admin-text-primary whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedContractPreview, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={Boolean(selectedAgentsIntegration)}
        onClose={() => setShowAgentsFor(null)}
        title={selectedAgentsIntegration ? `${selectedAgentsIntegration.name} Usage` : 'Agent Usage'}
        description="Agents currently mapped through stable integration IDs."
        footer={
          <Button variant="ghost" onClick={() => setShowAgentsFor(null)}>
            Close
          </Button>
        }
      >
        {selectedAgentsIntegration && (
          <div className="space-y-3">
            {selectedAgentsIntegration.usedByAgents.length === 0 ? (
              <EmptyState
                title="No mapped agents"
                description="Assign this integration to an agent from the configuration drawer."
              />
            ) : (
              selectedAgentsIntegration.usedByAgents.map((usage) => (
                <div key={usage.agentName} className="rounded-lg border border-admin-border p-4">
                  <p className="text-sm font-semibold text-admin-text-primary">{usage.agentName}</p>
                  <p className="text-xs text-secondary mt-2">Voice: {usage.voice}</p>
                  <p className="text-xs text-secondary">LLM: {usage.llm}</p>
                  <p className="text-xs text-secondary">Realtime: {usage.realtime}</p>
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignAgent(selectedAgentsIntegration.id, usage.agentName)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
