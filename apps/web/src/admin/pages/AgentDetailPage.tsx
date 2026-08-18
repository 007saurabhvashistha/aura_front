import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { Drawer } from '../components/Drawer';
import { AssignmentDrawer, type AssignableItem } from '../components/AssignmentDrawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowMenu } from '../components/RowMenu';
import { Input } from '../components/Input';
import { TestTrace } from '../components/TestTrace';
import { useTestRuns } from '../hooks/useTestRuns';
import { useActivity } from '../hooks/useActivity';
import { TEST_TYPE_LABELS, type TestRunResult, type TestType } from '../services/testCenter';
import { toolValidationBadge, toolTestBadge, toolReadinessBadge, knowledgeReadinessBadge } from '../components/statusMaps';
import { useAgentRegistry, agentStatusDescriptor, type AgentStatus } from '../hooks/useAgentRegistry';
import { useAgentResources } from '../hooks/useAgentResources';
import {
  useIntegrationRegistry,
  type IntegrationCapability,
  type IntegrationRecord,
} from '../hooks/useIntegrationRegistry';
import { useKnowledgeRegistry, getKnowledgeReadiness } from '../hooks/useKnowledgeRegistry';
import { useToolRegistry, TOOL_TYPE_LABELS, getToolReadiness, toolReadinessReason } from '../hooks/useToolRegistry';

const TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Configuration', value: 'configuration' },
  { label: 'Knowledge', value: 'knowledge' },
  { label: 'Tools', value: 'tools' },
  { label: 'Integrations', value: 'integrations' },
  { label: 'Versions', value: 'versions' },
  { label: 'Activity', value: 'activity' },
  { label: 'Test', value: 'test' },
];

const CAPABILITY_LABELS: Record<IntegrationCapability, string> = {
  intelligence: 'Intelligence (LLM)',
  voice: 'Voice',
  realtime: 'Realtime',
  calling: 'Telephony',
};

function integrationStatusVariant(status: IntegrationRecord['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'connected') return 'success';
  if (status === 'failed' || status === 'validation_error') return 'danger';
  if (status === 'disabled') return 'warning';
  if (status === 'testing') return 'info';
  return 'default';
}

export function AgentDetailPage() {
  const { agentId = '', tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab ?? 'overview';

  const {
    getAgentById,
    publishAgent,
    disableAgent,
    enableAgent,
    archiveAgent,
    restoreAgent,
    createNewVersion,
    duplicateAgent,
  } = useAgentRegistry();
  const { cloneResources } = useAgentResources();
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
    run: () => void;
  } | null>(null);
  const agent = getAgentById(agentId);

  if (!agent) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Agent not found"
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Agents', href: '/admin/agents' }, { label: 'Not found' }]}
        />
        <EmptyState
          title="This agent does not exist"
          description="It may have been archived or the link is out of date."
          action={
            <Link to="/admin/agents">
              <Button variant="primary">Back to Agents</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const status = agentStatusDescriptor(agent.status);

  const handleDuplicate = () => {
    const copy = duplicateAgent(agent.id);
    if (copy) {
      cloneResources(agent.id, copy.id, copy.name);
      navigate(`/admin/agents/${copy.id}`);
    }
  };

  const goTest = () => navigate(`/admin/agents/${agent.id}/test`);

  // Lifecycle-aware actions: only valid transitions are exposed for the state.
  const lifecycleItems: { label: string; onClick: () => void; destructive?: boolean }[] = [
    { label: 'Test', onClick: goTest },
  ];

  if (agent.status === 'draft') {
    lifecycleItems.push({
      label: 'Publish',
      onClick: () =>
        setConfirm({
          title: 'Publish agent?',
          description: 'Publishing promotes the current draft version and makes the agent live.',
          confirmLabel: 'Publish',
          destructive: false,
          run: () => publishAgent(agent.id),
        }),
    });
    lifecycleItems.push({ label: 'Duplicate', onClick: handleDuplicate });
    lifecycleItems.push({
      label: 'Archive',
      destructive: true,
      onClick: () =>
        setConfirm({
          title: 'Archive agent?',
          description: 'The agent will be archived and hidden from active lists.',
          confirmLabel: 'Archive',
          destructive: true,
          run: () => archiveAgent(agent.id),
        }),
    });
  } else if (agent.status === 'published') {
    lifecycleItems.push({
      label: 'Disable',
      onClick: () =>
        setConfirm({
          title: 'Disable agent?',
          description: 'The agent will stop serving until re-enabled.',
          confirmLabel: 'Disable',
          destructive: true,
          run: () => disableAgent(agent.id),
        }),
    });
    lifecycleItems.push({
      label: 'Create New Version',
      onClick: () => {
        createNewVersion(agent.id);
        navigate(`/admin/agents/${agent.id}/edit`);
      },
    });
    lifecycleItems.push({ label: 'Duplicate', onClick: handleDuplicate });
  } else if (agent.status === 'disabled') {
    lifecycleItems.push({ label: 'Enable', onClick: () => enableAgent(agent.id) });
    lifecycleItems.push({ label: 'Duplicate', onClick: handleDuplicate });
    lifecycleItems.push({
      label: 'Archive',
      destructive: true,
      onClick: () =>
        setConfirm({
          title: 'Archive agent?',
          description: 'The agent will be archived and hidden from active lists.',
          confirmLabel: 'Archive',
          destructive: true,
          run: () => archiveAgent(agent.id),
        }),
    });
  } else if (agent.status === 'archived') {
    lifecycleItems.push({ label: 'Restore', onClick: () => restoreAgent(agent.id) });
    lifecycleItems.push({ label: 'Duplicate', onClick: handleDuplicate });
  } else {
    lifecycleItems.push({ label: 'Duplicate', onClick: handleDuplicate });
  }

  return (
    <div className="admin-page">
      <PageHeader
        title={agent.name}
        description={agent.description}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Agents', href: '/admin/agents' },
          { label: agent.name },
        ]}
        actions={[{ label: 'Edit Agent', variant: 'primary', href: `/admin/agents/${agent.id}/edit` }]}
      />

      <div className="admin-detail-statusbar">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="admin-cell-sub">Environment: {agent.environment}</span>
        <span className="admin-cell-sub">Published: {agent.publishedVersion ?? '—'}</span>
        <span className="admin-cell-sub">Updated: {agent.updatedAt}</span>
        <div className="admin-detail-statusbar-actions">
          <RowMenu items={lifecycleItems} label="Lifecycle actions" />
        </div>
      </div>

      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={(value) => navigate(`/admin/agents/${agent.id}/${value}`)}
      />

      {activeTab === 'overview' && <OverviewTab agentId={agent.id} agentStatus={agent.status} createdAt={agent.createdAt} updatedAt={agent.updatedAt} publishedVersion={agent.publishedVersion} description={agent.description} />}
      {activeTab === 'configuration' && <ConfigurationTab agentId={agent.id} agentStatus={agent.status} />}
      {activeTab === 'knowledge' && <KnowledgeTab agentId={agent.id} />}
      {activeTab === 'tools' && <ToolsTab agentId={agent.id} />}
      {activeTab === 'integrations' && <IntegrationsTab agentId={agent.id} />}
      {activeTab === 'versions' && <VersionsTab agentId={agent.id} />}
      {activeTab === 'activity' && <ActivityTab agentId={agent.id} />}
      {activeTab === 'test' && <TestTab agentId={agent.id} />}

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.description ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        destructive={confirm?.destructive ?? false}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Overview */

interface OverviewProps {
  agentId: string;
  agentStatus: AgentStatus;
  createdAt: string;
  updatedAt: string;
  publishedVersion: string | null;
  description: string;
}

function OverviewTab({ agentId, createdAt, updatedAt, publishedVersion, description }: OverviewProps) {
  const { agents: bindings, getIntegrationById } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();

  const binding = bindings.find((item) => item.id === agentId);
  const refs = binding?.integrationRefs;

  const integrationValue = (capability: IntegrationCapability) => {
    const id =
      capability === 'intelligence'
        ? refs?.intelligenceIntegrationId
        : capability === 'voice'
          ? refs?.voiceIntegrationId
          : capability === 'realtime'
            ? refs?.realtimeIntegrationId
            : refs?.callingIntegrationId;
    if (!id) return 'Not assigned';
    const integration = getIntegrationById(id);
    return integration ? `${integration.config.provider || 'Provider'} · ${integration.name}` : 'Not assigned';
  };

  const assignedKnowledge = knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agentId));
  const assignedTools = tools.filter((tool) => tool.assignedAgentIds.includes(agentId));

  const summary: { label: string; value: string }[] = [
    { label: 'Intelligence (LLM)', value: integrationValue('intelligence') },
    { label: 'Voice', value: integrationValue('voice') },
    { label: 'Realtime', value: integrationValue('realtime') },
    { label: 'Telephony', value: integrationValue('calling') },
    { label: 'Knowledge bases', value: String(assignedKnowledge.length) },
    { label: 'Tools', value: String(assignedTools.length) },
  ];

  const identity: { label: string; value: string }[] = [
    { label: 'Description', value: description || '—' },
    { label: 'Created', value: createdAt },
    { label: 'Last updated', value: updatedAt },
    { label: 'Published version', value: publishedVersion ?? '—' },
  ];

  return (
    <div className="admin-detail-body">
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Identity</h3>
        <dl className="admin-detail-grid">
          {identity.map((item) => (
            <div key={item.label} className="admin-detail-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Resource summary</h3>
        <dl className="admin-detail-grid">
          {summary.map((item) => (
            <div key={item.label} className="admin-detail-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- Configuration */

function ConfigurationTab({ agentId, agentStatus }: { agentId: string; agentStatus: AgentStatus }) {
  const isDraft = agentStatus === 'draft';
  return (
    <div className="admin-detail-body">
      <DemoNotice message="Configuration is edited in Agent Builder, the single source for agent setup and publish readiness." />
      <section className="admin-detail-section">
        <div className="admin-detail-inline">
          <div>
            <h3 className="admin-section-title">Configuration</h3>
            <p className="admin-cell-sub">
              {isDraft
                ? 'This agent is a draft. Complete configuration in Agent Builder to publish.'
                : 'This agent has a published configuration. Open Agent Builder to make changes.'}
            </p>
          </div>
          <Link to={`/admin/agents/${agentId}/edit`} className="btn btn-primary">
            Edit Agent
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- Knowledge */

function KnowledgeTab({ agentId }: { agentId: string }) {
  const { knowledgeBases, assignAgent, removeAgent } = useKnowledgeRegistry();
  const { logActivity } = useAgentRegistry();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const assigned = knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agentId));
  const available = knowledgeBases.filter((kb) => !kb.assignedAgentIds.includes(agentId));

  const toItem = (id: string): AssignableItem => {
    const kb = knowledgeBases.find((item) => item.id === id)!;
    return { id: kb.id, name: kb.name, meta: `${kb.sources.length} sources · ${kb.indexStatus}` };
  };

  const handleAssign = (id: string) => {
    assignAgent(id, agentId);
    const kb = knowledgeBases.find((item) => item.id === id);
    logActivity(agentId, 'knowledge_assigned', `Knowledge base "${kb?.name ?? id}" assigned.`);
  };

  const handleRemove = (id: string) => {
    const kb = knowledgeBases.find((item) => item.id === id);
    removeAgent(id, agentId);
    logActivity(agentId, 'knowledge_removed', `Knowledge base "${kb?.name ?? id}" removed.`);
  };

  return (
    <div className="admin-detail-body">
      <div className="admin-detail-inline">
        <h3 className="admin-section-title">Assigned knowledge</h3>
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          Assign Knowledge
        </Button>
      </div>

      {assigned.length === 0 ? (
        <EmptyState
          title="No knowledge assigned"
          description="Assign a knowledge base so this agent can retrieve grounded answers."
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Assign Knowledge
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Knowledge base</th>
                <th>Readiness</th>
                <th>Sources</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assigned.map((kb) => {
                const badge = knowledgeReadinessBadge(getKnowledgeReadiness(kb));
                return (
                  <tr key={kb.id}>
                    <td>
                      <p className="admin-cell-title">{kb.name}</p>
                      <p className="admin-cell-sub">{kb.description}</p>
                    </td>
                    <td>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="admin-cell-sub">{kb.sources.length}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link to={`/admin/knowledge/${kb.id}`} className="btn btn-ghost">
                          Open
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(kb.id)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AssignmentDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Assign Knowledge"
        description="Attach knowledge bases to this agent. Assignment updates the Knowledge Registry."
        assigned={assigned.map((kb) => toItem(kb.id))}
        available={available.map((kb) => toItem(kb.id))}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}

/* -------------------------------------------------------------------- Tools */

function ToolsTab({ agentId }: { agentId: string }) {
  const { tools, assignAgent, removeAgent, testTool } = useToolRegistry();
  const { logActivity } = useAgentRegistry();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const assigned = tools.filter((tool) => tool.assignedAgentIds.includes(agentId));
  const available = tools.filter((tool) => !tool.assignedAgentIds.includes(agentId));

  const toItem = (id: string): AssignableItem => {
    const tool = tools.find((item) => item.id === id)!;
    return { id: tool.id, name: tool.name, meta: `${TOOL_TYPE_LABELS[tool.type]} · ${getToolReadiness(tool)}` };
  };

  const handleAssign = (id: string) => {
    assignAgent(id, agentId);
    const tool = tools.find((item) => item.id === id);
    logActivity(agentId, 'tool_assigned', `Tool "${tool?.name ?? id}" assigned.`);
  };

  const handleRemove = (id: string) => {
    const tool = tools.find((item) => item.id === id);
    removeAgent(id, agentId);
    logActivity(agentId, 'tool_removed', `Tool "${tool?.name ?? id}" removed.`);
  };

  return (
    <div className="admin-detail-body">
      <div className="admin-detail-inline">
        <h3 className="admin-section-title">Assigned tools</h3>
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          Assign Tool
        </Button>
      </div>

      {assigned.length === 0 ? (
        <EmptyState
          title="No tools assigned"
          description="Assign a tool so this agent can take actions during a conversation."
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Assign Tool
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Type</th>
                <th>Readiness</th>
                <th>Validation</th>
                <th>Test</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assigned.map((tool) => {
                const validation = toolValidationBadge(tool.validationState);
                const test = toolTestBadge(tool.testState);
                const readiness = getToolReadiness(tool);
                const readinessMeta = toolReadinessBadge(readiness);
                return (
                  <tr key={tool.id}>
                    <td>
                      <p className="admin-cell-title">{tool.name}</p>
                      <p className="admin-cell-sub">{toolReadinessReason(readiness)}</p>
                    </td>
                    <td className="admin-cell-sub">{TOOL_TYPE_LABELS[tool.type]}</td>
                    <td>
                      <Badge variant={readinessMeta.variant}>{readinessMeta.label}</Badge>
                    </td>
                    <td>
                      <Badge variant={validation.variant}>{validation.label}</Badge>
                    </td>
                    <td>
                      <Badge variant={test.variant}>{test.label}</Badge>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Button variant="ghost" size="sm" onClick={() => testTool(tool.id)}>
                          Test
                        </Button>
                        <Link to={`/admin/tools/${tool.id}`} className="btn btn-ghost">
                          Open
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(tool.id)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AssignmentDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Assign Tool"
        description="Attach tools to this agent. Assignment updates the Tool Registry."
        assigned={assigned.map((tool) => toItem(tool.id))}
        available={available.map((tool) => toItem(tool.id))}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}

/* ------------------------------------------------------------- Integrations */

function IntegrationsTab({ agentId }: { agentId: string }) {
  const { agents: bindings, getIntegrationById, getIntegrationsByCapability, assignAgentToIntegration, removeAgentFromIntegration } =
    useIntegrationRegistry();
  const { logActivity } = useAgentRegistry();
  const [changing, setChanging] = useState<IntegrationCapability | null>(null);

  const binding = bindings.find((item) => item.id === agentId);
  const refs = binding?.integrationRefs;

  const rows: { capability: IntegrationCapability; integrationId: IntegrationRecord['id'] | null }[] = [
    { capability: 'intelligence', integrationId: refs?.intelligenceIntegrationId ?? null },
    { capability: 'voice', integrationId: refs?.voiceIntegrationId ?? null },
    { capability: 'realtime', integrationId: refs?.realtimeIntegrationId ?? null },
    { capability: 'calling', integrationId: refs?.callingIntegrationId ?? null },
  ];

  const options = changing ? getIntegrationsByCapability(changing) : [];

  return (
    <div className="admin-detail-body">
      <h3 className="admin-section-title">Integration bindings</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Integration</th>
              <th>Provider</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const integration = row.integrationId ? getIntegrationById(row.integrationId) : null;
              return (
                <tr key={row.capability}>
                  <td className="admin-cell-title">{CAPABILITY_LABELS[row.capability]}</td>
                  <td className="admin-cell-sub">{integration ? integration.name : 'Not assigned'}</td>
                  <td className="admin-cell-sub">{integration ? integration.config.provider || '—' : '—'}</td>
                  <td>
                    {integration ? (
                      <Badge variant={integrationStatusVariant(integration.status)}>{integration.status}</Badge>
                    ) : (
                      <Badge variant="default">unassigned</Badge>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setChanging(row.capability)}>
                        Change
                      </Button>
                      <Link to="/admin/integrations" className="btn btn-ghost">
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={changing !== null}
        onClose={() => setChanging(null)}
        title={changing ? `Change ${CAPABILITY_LABELS[changing]}` : 'Change integration'}
        description="Select a connected integration for this capability. Updates the Integration Registry binding."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="primary" onClick={() => setChanging(null)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="admin-assign">
          <ul className="admin-assign-list">
            {options.map((integration) => {
              const isCurrent =
                (changing === 'intelligence' && refs?.intelligenceIntegrationId === integration.id) ||
                (changing === 'voice' && refs?.voiceIntegrationId === integration.id) ||
                (changing === 'realtime' && refs?.realtimeIntegrationId === integration.id) ||
                (changing === 'calling' && refs?.callingIntegrationId === integration.id);
              return (
                <li key={integration.id} className="admin-assign-row">
                  <div>
                    <p className="admin-assign-name">{integration.name}</p>
                    <p className="admin-assign-meta">
                      {integration.config.provider || 'Provider'} · {integration.status}
                    </p>
                  </div>
                  {isCurrent ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removeAgentFromIntegration(integration.id, agentId);
                        logActivity(agentId, 'integration_changed', `${CAPABILITY_LABELS[changing!]} unassigned.`);
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        assignAgentToIntegration(integration.id, agentId);
                        logActivity(agentId, 'integration_changed', `${CAPABILITY_LABELS[changing!]} set to ${integration.name}.`);
                      }}
                    >
                      Use
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Drawer>
    </div>
  );
}

/* ----------------------------------------------------------------- Versions */

function VersionsTab({ agentId }: { agentId: string }) {
  const { getAgentById } = useAgentRegistry();
  const agent = getAgentById(agentId);
  const versions = agent?.versions ?? [];

  const variant = (status: string): 'default' | 'success' | 'info' =>
    status === 'published' ? 'success' : status === 'draft' ? 'info' : 'default';

  return (
    <div className="admin-detail-body">
      <DemoNotice message="Version history is demo state — no backend persistence. Restore/compare are UI architecture only." />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th>Created by</th>
              <th>Published</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr key={version.id}>
                <td className="admin-cell-title">{version.label}</td>
                <td>
                  <Badge variant={variant(version.status)}>{version.status}</Badge>
                </td>
                <td className="admin-cell-sub">{version.createdAt}</td>
                <td className="admin-cell-sub">{version.createdBy}</td>
                <td className="admin-cell-sub">{version.publishedAt ?? '—'}</td>
                <td>
                  <div className="admin-row-actions">
                    <Button variant="ghost" size="sm" disabled>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" disabled>
                      Compare
                    </Button>
                    <Button variant="ghost" size="sm" disabled>
                      Restore
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Activity */

function ActivityTab({ agentId }: { agentId: string }) {
  const { events } = useActivity({ resourceId: agentId, limit: 30 });

  return (
    <div className="admin-detail-body">
      <DemoNotice message="DEMO / SIMULATED: Filtered view of the global Activity Control Center. Nothing is persisted yet." />

      <div className="admin-detail-inline">
        <h3 className="admin-section-title">Recent activity</h3>
        <Link to={`/admin/activity?resourceId=${agentId}`} className="btn btn-secondary">
          View all activity
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions on this agent will appear here." />
      ) : (
        <ol className="admin-timeline">
          {events.map((entry) => (
            <li key={entry.id} className="admin-timeline-item">
              <span className="admin-timeline-dot" aria-hidden="true" />
              <div>
                <div className="cp-attention-title-row">
                  <Badge variant={entry.status === 'success' ? 'success' : entry.status === 'failure' ? 'danger' : 'info'}>
                    {entry.status}
                  </Badge>
                  <p className="admin-cell-title">{entry.summary}</p>
                </div>
                <p className="admin-cell-sub">
                  {entry.actor} · {entry.timestamp}
                </p>
                {entry.resourceType === 'test' && (
                  <Link to={entry.href} className="tc-trace-link">
                    Open test run →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- Test */

function TestTab({ agentId }: { agentId: string }) {
  const { getAgentById } = useAgentRegistry();
  const { runTest, mode } = useTestRuns();
  const [testType, setTestType] = useState<TestType>('conversation');
  const [input, setInput] = useState('What is your refund policy?');
  const [result, setResult] = useState<TestRunResult | null>(null);

  const agent = getAgentById(agentId);
  const versionLabel = agent?.publishedVersion ?? agent?.versions[0]?.label ?? 'draft';

  const handleRun = () => {
    setResult(
      runTest({
        agentId,
        versionLabel,
        environment: 'demo',
        testType,
        input: input.trim(),
      }),
    );
  };

  return (
    <div className="admin-detail-body">
      <DemoNotice
        message={
          mode === 'SIMULATED'
            ? 'DEMO / SIMULATED: Runs through the shared Test Center service. No runtime or provider call is executed.'
            : 'REAL / CONNECTED: Runs against the connected runtime.'
        }
      />

      <section className="admin-detail-section">
        <div className="admin-detail-inline">
          <div>
            <h3 className="admin-section-title">Quick test</h3>
            <p className="admin-cell-sub">Version {versionLabel} · demo environment</p>
          </div>
          <Link to={`/admin/test?agent=${agentId}`} className="btn btn-secondary">
            Open in Test Center
          </Link>
        </div>

        <div className="admin-form" style={{ marginTop: '0.75rem' }}>
          <label className="admin-field">
            <span className="admin-field-label">Test type</span>
            <select className="admin-select" value={testType} onChange={(e) => setTestType(e.target.value as TestType)}>
              {(Object.entries(TEST_TYPE_LABELS) as [TestType, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Input label="Test input" value={input} onChange={(e) => setInput(e.target.value)} />
          <div>
            <Button variant="primary" onClick={handleRun} disabled={!input.trim()}>
              Run test
            </Button>
          </div>
        </div>
      </section>

      {result && (
        <section className="admin-detail-section">
          <div className="admin-detail-inline">
            <h3 className="admin-section-title">Result</h3>
            <div className="admin-row-actions">
              <Badge variant={result.status === 'passed' ? 'success' : 'danger'}>{result.status.toUpperCase()}</Badge>
              <span className="admin-cell-sub">{result.totalLatencyMs} ms</span>
              <Link to={`/admin/test/runs/${result.id}`} className="btn btn-ghost">
                Open run
              </Link>
            </div>
          </div>
          <TestTrace result={result} />
        </section>
      )}
    </div>
  );
}
