import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { DemoNotice } from '../components/DemoNotice';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowMenu } from '../components/RowMenu';
import { AssignmentDrawer, type AssignableItem } from '../components/AssignmentDrawer';
import { toolReadinessBadge, toolTestBadge, toolValidationBadge } from '../components/statusMaps';
import { useAgentRegistry } from '../hooks/useAgentRegistry';
import {
  TOOL_AUTH_LABELS,
  TOOL_HTTP_METHODS,
  TOOL_TYPE_LABELS,
  getToolReadiness,
  maskToolSecret,
  toolReadinessReason,
  useToolRegistry,
  type Tool,
  type ToolAuth,
  type ToolAuthType,
  type ToolConfig,
  type ToolHttpMethod,
  type ToolSchema,
  type ToolType,
} from '../hooks/useToolRegistry';

const TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Configuration', value: 'configuration' },
  { label: 'Authentication', value: 'authentication' },
  { label: 'Schema', value: 'schema' },
  { label: 'Test', value: 'test' },
  { label: 'Agents', value: 'agents' },
  { label: 'Activity', value: 'activity' },
];

const TOOL_TYPES = Object.entries(TOOL_TYPE_LABELS) as [ToolType, string][];
const AUTH_TYPES = Object.entries(TOOL_AUTH_LABELS) as [ToolAuthType, string][];

export function ToolDetailPage() {
  const { toolId = '', tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab ?? 'overview';

  const { getToolById, updateTool, duplicateTool, deleteTool, toggleTool, validateTool } = useToolRegistry();
  const [editing, setEditing] = useState<{ name: string; description: string; type: ToolType } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tool = getToolById(toolId);

  if (!tool) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Tool not found"
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Tools', href: '/admin/tools' }, { label: 'Not found' }]}
        />
        <EmptyState
          title="This tool does not exist"
          description="It may have been deleted or the link is out of date."
          action={
            <Link to="/admin/tools">
              <Button variant="primary">Back to Tools</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const readiness = getToolReadiness(tool);
  const badge = toolReadinessBadge(readiness);
  const canEnable = tool.validationState === 'validated';

  const lifecycleItems: { label: string; onClick: () => void; destructive?: boolean }[] = [
    { label: 'Edit details', onClick: () => setEditing({ name: tool.name, description: tool.description, type: tool.type }) },
    { label: 'Validate', onClick: () => validateTool(tool.id) },
    {
      label: 'Duplicate',
      onClick: () => {
        const copy = duplicateTool(tool.id);
        if (copy) navigate(`/admin/tools/${copy.id}`);
      },
    },
    tool.enabled
      ? { label: 'Disable', onClick: () => toggleTool(tool.id, false) }
      : { label: canEnable ? 'Enable' : 'Enable (validate first)', onClick: () => toggleTool(tool.id, true) },
    { label: 'Delete', destructive: true, onClick: () => setConfirmDelete(true) },
  ];

  return (
    <div className="admin-page">
      <PageHeader
        title={tool.name}
        description={tool.description}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Tools', href: '/admin/tools' },
          { label: tool.name },
        ]}
        actions={[{ label: 'Run test', variant: 'primary', href: `/admin/tools/${tool.id}/test` }]}
      />

      <div className="admin-detail-statusbar">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="admin-cell-sub">{toolReadinessReason(readiness)}</span>
        <span className="admin-cell-sub">Type: {TOOL_TYPE_LABELS[tool.type]}</span>
        <span className="admin-cell-sub">Agents: {tool.assignedAgentIds.length}</span>
        <span className="admin-cell-sub">Updated: {tool.updatedAt}</span>
        <div className="admin-detail-statusbar-actions">
          <RowMenu items={lifecycleItems} label="Tool actions" />
        </div>
      </div>

      {tool.errors.length > 0 && (
        <ErrorState
          title="Validation issues"
          description={tool.errors.join(' ')}
          action={
            <Link to={`/admin/tools/${tool.id}/configuration`} className="btn btn-secondary">
              Open configuration
            </Link>
          }
        />
      )}

      <Tabs tabs={TABS} active={activeTab} onChange={(value) => navigate(`/admin/tools/${tool.id}/${value}`)} />

      {activeTab === 'overview' && <OverviewTab tool={tool} />}
      {activeTab === 'configuration' && <ConfigurationTab tool={tool} />}
      {activeTab === 'authentication' && <AuthenticationTab tool={tool} />}
      {activeTab === 'schema' && <SchemaTab tool={tool} />}
      {activeTab === 'test' && <TestTab tool={tool} />}
      {activeTab === 'agents' && <AgentsTab tool={tool} />}
      {activeTab === 'activity' && <ActivityTab tool={tool} />}

      <Drawer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Tool"
        description="Update the tool name, description, and type."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!editing?.name.trim()}
              onClick={() => {
                if (editing?.name.trim()) updateTool(tool.id, editing);
                setEditing(null);
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input
            label="Name"
            value={editing?.name ?? ''}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
          />
          <Input
            label="Description"
            value={editing?.description ?? ''}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
          />
          <label className="admin-field">
            <span className="admin-field-label">Type</span>
            <select
              className="admin-select"
              value={editing?.type ?? tool.type}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, type: e.target.value as ToolType } : prev))}
            >
              {TOOL_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete tool?"
        description={
          tool.assignedAgentIds.length > 0
            ? `This tool is assigned to ${tool.assignedAgentIds.length} agent(s). Deleting removes those assignments. This cannot be undone.`
            : 'This permanently removes the tool and its configuration. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTool(tool.id);
          navigate('/admin/tools');
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Overview */

function OverviewTab({ tool }: { tool: Tool }) {
  const validation = toolValidationBadge(tool.validationState);
  const test = toolTestBadge(tool.testState);

  const items: { label: string; value: string }[] = [
    { label: 'Description', value: tool.description || '—' },
    { label: 'Type', value: TOOL_TYPE_LABELS[tool.type] },
    { label: 'Validation', value: validation.label },
    { label: 'Test', value: test.label },
    { label: 'Enabled', value: tool.enabled ? 'Yes' : 'No' },
    { label: 'Endpoint', value: tool.config.endpointUrl || 'Not set' },
    { label: 'Auth type', value: TOOL_AUTH_LABELS[tool.auth.type] },
    { label: 'Assigned agents', value: String(tool.assignedAgentIds.length) },
    { label: 'Last test', value: tool.lastTest ? `${tool.lastTest.status} · ${tool.lastTest.ranAt}` : 'Never' },
    { label: 'Created', value: tool.createdAt },
    { label: 'Last updated', value: tool.updatedAt },
  ];

  return (
    <div className="admin-detail-body">
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Overview</h3>
        <dl className="admin-detail-grid">
          {items.map((item) => (
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

function ConfigurationTab({ tool }: { tool: Tool }) {
  const { updateConfig, validateTool } = useToolRegistry();
  const [draft, setDraft] = useState<ToolConfig>(tool.config);

  useEffect(() => {
    setDraft(tool.config);
  }, [tool.config]);

  return (
    <div className="admin-detail-body">
      <DemoNotice message="DEMO / SIMULATED: Configuration is stored in frontend registry state. No external request is ever sent." />
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Transport configuration</h3>
        <div className="admin-form">
          <Input
            label="Endpoint URL"
            placeholder="https://api.yourcompany.com/v1/resource"
            value={draft.endpointUrl}
            onChange={(e) => setDraft((prev) => ({ ...prev, endpointUrl: e.target.value }))}
          />
          <label className="admin-field">
            <span className="admin-field-label">Method</span>
            <select
              className="admin-select"
              value={draft.method}
              onChange={(e) => setDraft((prev) => ({ ...prev, method: e.target.value as ToolHttpMethod }))}
            >
              {TOOL_HTTP_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <Input
            label="Timeout (ms)"
            placeholder="8000"
            value={draft.timeoutMs}
            onChange={(e) => setDraft((prev) => ({ ...prev, timeoutMs: e.target.value }))}
          />
          <label className="admin-field">
            <span className="admin-field-label">Headers (JSON object)</span>
            <textarea
              rows={4}
              className="admin-select"
              placeholder='{"Content-Type":"application/json"}'
              value={draft.headers}
              onChange={(e) => setDraft((prev) => ({ ...prev, headers: e.target.value }))}
            />
          </label>
          <div className="admin-row-actions">
            <Button variant="primary" onClick={() => updateConfig(tool.id, draft)}>Save configuration</Button>
            <Button variant="secondary" onClick={() => validateTool(tool.id)}>Validate</Button>
            <Button variant="ghost" onClick={() => setDraft(tool.config)}>Reset</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Authentication */

function AuthenticationTab({ tool }: { tool: Tool }) {
  const { updateAuth, validateTool } = useToolRegistry();
  const [draft, setDraft] = useState<ToolAuth>(tool.auth);

  useEffect(() => {
    setDraft(tool.auth);
  }, [tool.auth]);

  return (
    <div className="admin-detail-body">
      <DemoNotice message="Credentials are never displayed in previews, tests, or activity logs — only masked values are shown." />
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Authentication</h3>
        <div className="admin-form">
          <label className="admin-field">
            <span className="admin-field-label">Auth type</span>
            <select
              className="admin-select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value as ToolAuthType }))}
            >
              {AUTH_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {draft.type === 'api_key' && (
            <Input
              label="Header name"
              placeholder="X-API-Key"
              value={draft.headerName}
              onChange={(e) => setDraft((prev) => ({ ...prev, headerName: e.target.value }))}
            />
          )}

          {draft.type === 'basic' && (
            <Input
              label="Username"
              placeholder="service-account"
              value={draft.username}
              onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))}
            />
          )}

          {draft.type !== 'none' && (
            <Input
              label={draft.type === 'basic' ? 'Password' : 'Secret'}
              type="password"
              placeholder="Enter credential"
              value={draft.secret}
              onChange={(e) => setDraft((prev) => ({ ...prev, secret: e.target.value }))}
            />
          )}

          <div className="admin-row-actions">
            <Button variant="primary" onClick={() => updateAuth(tool.id, draft)}>Save authentication</Button>
            <Button variant="secondary" onClick={() => validateTool(tool.id)}>Validate</Button>
            <Button variant="ghost" onClick={() => setDraft(tool.auth)}>Reset</Button>
          </div>
        </div>
      </section>

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Stored credential</h3>
        <dl className="admin-detail-grid">
          <div className="admin-detail-item">
            <dt>Auth type</dt>
            <dd>{TOOL_AUTH_LABELS[tool.auth.type]}</dd>
          </div>
          <div className="admin-detail-item">
            <dt>Header</dt>
            <dd>{tool.auth.headerName || '—'}</dd>
          </div>
          <div className="admin-detail-item">
            <dt>Username</dt>
            <dd>{tool.auth.username || '—'}</dd>
          </div>
          <div className="admin-detail-item">
            <dt>Secret</dt>
            <dd>{maskToolSecret(tool.auth.secret)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------- Schema */

function SchemaTab({ tool }: { tool: Tool }) {
  const { updateSchema, validateTool } = useToolRegistry();
  const [draft, setDraft] = useState<ToolSchema>(tool.schema);

  useEffect(() => {
    setDraft(tool.schema);
  }, [tool.schema]);

  return (
    <div className="admin-detail-body">
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Input / output contract</h3>
        <p className="admin-cell-sub">A tool cannot be validated without a declared input and output schema.</p>
        <div className="admin-form" style={{ marginTop: '0.75rem' }}>
          <label className="admin-field">
            <span className="admin-field-label">Input schema (JSON object)</span>
            <textarea
              rows={6}
              className="admin-select"
              placeholder='{"orderId":"string"}'
              value={draft.inputSchema}
              onChange={(e) => setDraft((prev) => ({ ...prev, inputSchema: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Output schema (JSON object)</span>
            <textarea
              rows={6}
              className="admin-select"
              placeholder='{"status":"string"}'
              value={draft.outputSchema}
              onChange={(e) => setDraft((prev) => ({ ...prev, outputSchema: e.target.value }))}
            />
          </label>
          <div className="admin-row-actions">
            <Button variant="primary" onClick={() => updateSchema(tool.id, draft)}>Save schema</Button>
            <Button variant="secondary" onClick={() => validateTool(tool.id)}>Validate</Button>
            <Button variant="ghost" onClick={() => setDraft(tool.schema)}>Reset</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------------- Test */

function TestTab({ tool }: { tool: Tool }) {
  const { testTool, dryRunTool } = useToolRegistry();
  const [sampleInput, setSampleInput] = useState(tool.schema.inputSchema || '{"example":"value"}');

  const result = tool.lastTest;

  return (
    <div className="admin-detail-body">
      <DemoNotice message="DEMO / SIMULATED: Test and dry run are simulated locally. No external network call is performed." />

      <section className="admin-detail-section">
        <div className="admin-detail-inline">
          <div>
            <h3 className="admin-section-title">Test run</h3>
            <p className="admin-cell-sub">Validates configuration, then simulates a call using the declared schema.</p>
          </div>
          <Button variant="primary" onClick={() => testTool(tool.id)}>Run test</Button>
        </div>
      </section>

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Dry run</h3>
        <div className="admin-form">
          <label className="admin-field">
            <span className="admin-field-label">Sample input (JSON object)</span>
            <textarea
              rows={5}
              className="admin-select"
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
            />
          </label>
          <div>
            <Button variant="secondary" onClick={() => dryRunTool(tool.id, sampleInput)}>Run dry run</Button>
          </div>
        </div>
      </section>

      {result ? (
        <section className="admin-detail-section">
          <div className="admin-detail-inline">
            <h3 className="admin-section-title">Last result</h3>
            <Badge variant={result.status === 'passed' ? 'success' : 'danger'}>{result.status}</Badge>
          </div>
          <dl className="admin-detail-grid">
            <div className="admin-detail-item"><dt>Message</dt><dd>{result.message}</dd></div>
            <div className="admin-detail-item"><dt>Latency</dt><dd>{result.latencyMs} ms</dd></div>
            <div className="admin-detail-item"><dt>Ran at</dt><dd>{result.ranAt}</dd></div>
          </dl>
          <div className="admin-detail-grid" style={{ marginTop: '0.75rem' }}>
            <div className="admin-detail-item">
              <dt>Request preview</dt>
              <dd><pre className="cp-code-block">{result.requestPreview}</pre></dd>
            </div>
            <div className="admin-detail-item">
              <dt>Response preview</dt>
              <dd><pre className="cp-code-block">{result.responsePreview}</pre></dd>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState title="No test run yet" description="Run a test to verify this tool before assigning it to agents." />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- Agents */

function AgentsTab({ tool }: { tool: Tool }) {
  const { assignAgent, removeAgent } = useToolRegistry();
  const { agents, logActivity } = useAgentRegistry();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const assigned = agents.filter((agent) => tool.assignedAgentIds.includes(agent.id));
  const available = agents.filter((agent) => !tool.assignedAgentIds.includes(agent.id));

  const item = (agentId: string): AssignableItem => {
    const agent = agents.find((entry) => entry.id === agentId);
    return { id: agentId, name: agent?.name ?? agentId, meta: agent?.status };
  };

  const handleAssign = (agentId: string) => {
    assignAgent(tool.id, agentId);
    logActivity(agentId, 'tool_assigned', `Tool "${tool.name}" assigned.`);
  };

  const handleRemove = (agentId: string) => {
    removeAgent(tool.id, agentId);
    logActivity(agentId, 'tool_removed', `Tool "${tool.name}" removed.`);
  };

  return (
    <div className="admin-detail-body">
      <div className="admin-detail-inline">
        <h3 className="admin-section-title">Assigned agents</h3>
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>Assign Agent</Button>
      </div>

      {assigned.length === 0 ? (
        <EmptyState
          title="No agents assigned"
          description="Assign this tool to agents so they can call it during a conversation."
          action={<Button variant="primary" onClick={() => setDrawerOpen(true)}>Assign Agent</Button>}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assigned.map((agent) => (
                <tr key={agent.id}>
                  <td className="admin-cell-title">{agent.name}</td>
                  <td className="admin-cell-sub">{agent.status}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link to={`/admin/agents/${agent.id}/tools`} className="btn btn-ghost">Open</Link>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(agent.id)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignmentDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Assign Agents"
        description="Attach this tool to agents. Assignment updates the Tool Registry."
        assigned={assigned.map((agent) => item(agent.id))}
        available={available.map((agent) => item(agent.id))}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- Activity */

function ActivityTab({ tool }: { tool: Tool }) {
  return (
    <div className="admin-detail-body">
      <DemoNotice message="Activity timeline is demo state. Live activity will stream from the backend once connected." />
      <ol className="admin-timeline">
        {tool.activity.map((entry) => (
          <li key={entry.id} className="admin-timeline-item">
            <span className="admin-timeline-dot" aria-hidden="true" />
            <div>
              <p className="admin-cell-title">{entry.message}</p>
              <p className="admin-cell-sub">{entry.actor} · {entry.timestamp}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
