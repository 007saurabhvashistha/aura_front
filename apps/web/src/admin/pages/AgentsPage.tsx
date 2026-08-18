import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Drawer } from '../components/Drawer';
import { Input } from '../components/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowMenu } from '../components/RowMenu';
import { useAgentRegistry, agentStatusDescriptor } from '../hooks/useAgentRegistry';
import { useAgentResources } from '../hooks/useAgentResources';
import { useIntegrationRegistry } from '../hooks/useIntegrationRegistry';
import { useKnowledgeRegistry } from '../hooks/useKnowledgeRegistry';
import { useToolRegistry } from '../hooks/useToolRegistry';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Archived', value: 'archived' },
];

export function AgentsPage() {
  const navigate = useNavigate();
  const { agents, createAgent, duplicateAgent, disableAgent, enableAgent, archiveAgent } = useAgentRegistry();
  const { cloneResources } = useAgentResources();
  const { agents: integrationBindings, getIntegrationById } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<'updated' | 'name'>('updated');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: 'archive' | 'disable' } | null>(null);

  const resolveIntegrationLabel = (agentId: string, capability: 'intelligence' | 'voice') => {
    const binding = integrationBindings.find((item) => item.id === agentId);
    if (!binding) return 'Not assigned';
    const integrationId =
      capability === 'intelligence'
        ? binding.integrationRefs.intelligenceIntegrationId
        : binding.integrationRefs.voiceIntegrationId;
    if (!integrationId) return 'Not assigned';
    const integration = getIntegrationById(integrationId);
    if (!integration) return 'Not assigned';
    if (capability === 'intelligence') {
      return `${integration.config.provider || 'Provider'} / ${integration.config.model || 'Model'}`;
    }
    return `${integration.config.provider || 'Provider'} / ${integration.config.voiceId || 'Voice'}`;
  };

  const countKnowledge = (agentId: string) =>
    knowledgeBases.filter((kb) => kb.assignedAgentIds.includes(agentId)).length;
  const countTools = (agentId: string) => tools.filter((tool) => tool.assignedAgentIds.includes(agentId)).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = agents.filter((agent) => {
      const matchesSearch =
        !query || agent.name.toLowerCase().includes(query) || agent.description.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return [...rows].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [agents, search, statusFilter, sort]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const created = createAgent({ name, description });
    setName('');
    setDescription('');
    setDrawerOpen(false);
    navigate(`/admin/agents/${created.id}`);
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateAgent(id);
    if (copy) {
      cloneResources(id, copy.id, copy.name);
      navigate(`/admin/agents/${copy.id}`);
    }
  };

  const confirmMeta =
    confirm?.action === 'archive'
      ? {
          title: 'Archive agent?',
          description: 'The agent will be moved to archived and hidden from active lists. You can still open it directly.',
          confirmLabel: 'Archive',
        }
      : {
          title: 'Disable agent?',
          description: 'The agent will stop serving until re-enabled.',
          confirmLabel: 'Disable',
        };

  return (
    <div className="admin-page">
      <PageHeader
        title="Agents"
        description="Create, manage and monitor your AI agents."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Agents' }]}
        actions={[{ label: '+ Create Agent', variant: 'primary', onClick: () => setDrawerOpen(true) }]}
      />

      <DemoNotice message="Agent Control Center. Agents and their resource links are demo state until the backend is connected." />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agents"
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        actions={
          <label className="admin-field">
            <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'name')}>
              <option value="updated">Sort: Last updated</option>
              <option value="name">Sort: Name</option>
            </select>
          </label>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={agents.length === 0 ? 'No agents yet' : 'No matches'}
          description={
            agents.length === 0
              ? 'Create your first agent, then attach knowledge, tools, and integrations.'
              : 'Try a different search term or filter.'
          }
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Create Agent
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Voice</th>
                <th>Intelligence</th>
                <th>Knowledge</th>
                <th>Tools</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => {
                const status = agentStatusDescriptor(agent.status);
                return (
                  <tr key={agent.id}>
                    <td>
                      <button
                        type="button"
                        className="admin-link-cell"
                        onClick={() => navigate(`/admin/agents/${agent.id}`)}
                      >
                        {agent.name}
                      </button>
                      <p className="admin-cell-sub">{agent.description || 'No description'}</p>
                    </td>
                    <td>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="admin-cell-sub">{resolveIntegrationLabel(agent.id, 'voice')}</td>
                    <td className="admin-cell-sub">{resolveIntegrationLabel(agent.id, 'intelligence')}</td>
                    <td className="admin-cell-sub">{countKnowledge(agent.id)}</td>
                    <td className="admin-cell-sub">{countTools(agent.id)}</td>
                    <td className="admin-cell-sub">{agent.updatedAt}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/agents/${agent.id}`)}>
                          Open
                        </Button>
                        <RowMenu
                          items={[
                            { label: 'Edit', onClick: () => navigate(`/admin/agents/${agent.id}/edit`) },
                            { label: 'Duplicate', onClick: () => handleDuplicate(agent.id) },
                            agent.status === 'disabled'
                              ? { label: 'Enable', onClick: () => enableAgent(agent.id) }
                              : { label: 'Disable', onClick: () => setConfirm({ id: agent.id, action: 'disable' }) },
                            {
                              label: 'Archive',
                              destructive: true,
                              onClick: () => setConfirm({ id: agent.id, action: 'archive' }),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create Agent"
        description="Create a draft agent. Configure it in Agent Builder, then attach resources."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input label="Name" placeholder="e.g. Sales Assistant" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Description"
            placeholder="What this agent does"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmLabel={confirmMeta.confirmLabel}
        destructive={confirm?.action === 'archive'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            if (confirm.action === 'archive') archiveAgent(confirm.id);
            else disableAgent(confirm.id);
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
