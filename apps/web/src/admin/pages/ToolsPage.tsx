import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { Badge } from '../components/Badge';
import { Drawer } from '../components/Drawer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowMenu } from '../components/RowMenu';
import { toolReadinessBadge, toolTestBadge, toolValidationBadge } from '../components/statusMaps';
import { getAgentName } from '../data/demoAgents';
import { getToolReadiness, useToolRegistry, TOOL_TYPE_LABELS, type ToolType } from '../hooks/useToolRegistry';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Ready', value: 'READY' },
  { label: 'Not ready', value: 'UNVALIDATED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Disabled', value: 'DISABLED' },
];

const TOOL_TYPES = Object.entries(TOOL_TYPE_LABELS) as [ToolType, string][];

export function ToolsPage() {
  const navigate = useNavigate();
  const { tools, createTool, duplicateTool, deleteTool, toggleTool, testTool, validateTool } = useToolRegistry();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ToolType>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ToolType>('http');
  const [deleteFor, setDeleteFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesSearch =
        !query || tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query);
      const matchesReadiness = filter === 'all' || getToolReadiness(tool) === filter;
      const matchesType = typeFilter === 'all' || tool.type === typeFilter;
      return matchesSearch && matchesReadiness && matchesType;
    });
  }, [tools, search, filter, typeFilter]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const created = createTool({ name, description, type });
    setName('');
    setDescription('');
    setType('http');
    setDrawerOpen(false);
    navigate(`/admin/tools/${created.id}/configuration`);
  };

  const deleteTarget = deleteFor ? tools.find((tool) => tool.id === deleteFor) ?? null : null;

  return (
    <div className="admin-page">
      <PageHeader
        title="Tools"
        description="Register tools, define schemas, configure credentials, test them, and assign them to agents."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Tools' }]}
        actions={[{ label: '+ Create Tool', variant: 'primary', onClick: () => setDrawerOpen(true) }]}
      />

      <DemoNotice message="Tools Control Center. Configuration, credentials, and testing are simulated until the backend is connected." />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tools"
        filters={FILTERS}
        activeFilter={filter}
        onFilterChange={setFilter}
        actions={
          <label className="admin-field">
            <select
              className="admin-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | ToolType)}
            >
              <option value="all">All types</option>
              {TOOL_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={tools.length === 0 ? 'No tools yet' : 'No matches'}
          description={
            tools.length === 0
              ? 'Create a tool, define its schema, configure credentials, test it, then assign it to an agent.'
              : 'Try a different search term or filter.'
          }
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Create Tool
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
                <th>Agents</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => {
                const readiness = toolReadinessBadge(getToolReadiness(tool));
                const validation = toolValidationBadge(tool.validationState);
                const test = toolTestBadge(tool.testState);
                const assigned =
                  tool.assignedAgentIds.length > 0 ? tool.assignedAgentIds.map(getAgentName).join(', ') : 'None';
                return (
                  <tr key={tool.id}>
                    <td>
                      <button type="button" className="admin-link-cell" onClick={() => navigate(`/admin/tools/${tool.id}`)}>
                        {tool.name}
                      </button>
                      <p className="admin-cell-sub">{tool.description || 'No description'}</p>
                    </td>
                    <td className="admin-cell-sub">{TOOL_TYPE_LABELS[tool.type]}</td>
                    <td><Badge variant={readiness.variant}>{readiness.label}</Badge></td>
                    <td><Badge variant={validation.variant}>{validation.label}</Badge></td>
                    <td><Badge variant={test.variant}>{test.label}</Badge></td>
                    <td className="admin-cell-sub">{assigned}</td>
                    <td className="admin-cell-sub">{tool.updatedAt}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/tools/${tool.id}`)}>
                          Open
                        </Button>
                        <RowMenu
                          items={[
                            { label: 'Configure', onClick: () => navigate(`/admin/tools/${tool.id}/configuration`) },
                            { label: 'Validate', onClick: () => validateTool(tool.id) },
                            { label: 'Test', onClick: () => testTool(tool.id) },
                            {
                              label: 'Duplicate',
                              onClick: () => {
                                const copy = duplicateTool(tool.id);
                                if (copy) navigate(`/admin/tools/${copy.id}`);
                              },
                            },
                            tool.enabled
                              ? { label: 'Disable', onClick: () => toggleTool(tool.id, false) }
                              : { label: 'Enable', onClick: () => toggleTool(tool.id, true) },
                            { label: 'Delete', destructive: true, onClick: () => setDeleteFor(tool.id) },
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
        title="Create Tool"
        description="Choose a tool type. Schema, credentials, and configuration are added after creation."
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
          <Input label="Name" placeholder="e.g. Order Lookup API" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Description"
            placeholder="What this tool does"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="admin-field">
            <span className="admin-field-label">Type</span>
            <select className="admin-select" value={type} onChange={(e) => setType(e.target.value as ToolType)}>
              {TOOL_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={deleteFor !== null}
        title="Delete tool?"
        description={
          deleteTarget && deleteTarget.assignedAgentIds.length > 0
            ? `This tool is assigned to ${deleteTarget.assignedAgentIds.length} agent(s). Deleting removes those assignments. This cannot be undone.`
            : 'This permanently removes the tool and its configuration. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteFor(null)}
        onConfirm={() => {
          if (deleteFor) deleteTool(deleteFor);
          setDeleteFor(null);
        }}
      />
    </div>
  );
}
