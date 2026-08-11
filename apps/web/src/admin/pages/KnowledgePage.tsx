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
import { AssignmentDrawer, type AssignableItem } from '../components/AssignmentDrawer';
import { knowledgeReadinessBadge } from '../components/statusMaps';
import { useKnowledgeRegistry, getKnowledgeReadiness, type KnowledgeSourceType } from '../hooks/useKnowledgeRegistry';
import { useAgentRegistry } from '../hooks/useAgentRegistry';

const READINESS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Ready', value: 'READY' },
  { label: 'Indexing', value: 'INDEXING' },
  { label: 'Empty', value: 'EMPTY' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Disabled', value: 'DISABLED' },
];

const TYPE_OPTIONS: { label: string; value: 'all' | KnowledgeSourceType }[] = [
  { label: 'All source types', value: 'all' },
  { label: 'Document', value: 'document' },
  { label: 'URL', value: 'url' },
  { label: 'Text', value: 'text' },
  { label: 'FAQ', value: 'faq' },
];

export function KnowledgePage() {
  const navigate = useNavigate();
  const { knowledgeBases, createKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase, duplicateKnowledgeBase, reindexKnowledgeBase, assignAgent, removeAgent } =
    useKnowledgeRegistry();
  const { agents } = useAgentRegistry();

  const [search, setSearch] = useState('');
  const [readiness, setReadiness] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | KnowledgeSourceType>('all');
  const [sort, setSort] = useState<'updated' | 'name'>('updated');

  const [editing, setEditing] = useState<{ id: string | null; name: string; description: string } | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = knowledgeBases.filter((kb) => {
      const matchesSearch = !query || kb.name.toLowerCase().includes(query) || kb.description.toLowerCase().includes(query);
      const matchesReadiness = readiness === 'all' || getKnowledgeReadiness(kb) === readiness;
      const matchesType = typeFilter === 'all' || kb.sources.some((source) => source.type === typeFilter);
      return matchesSearch && matchesReadiness && matchesType;
    });
    return [...rows].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [knowledgeBases, search, readiness, typeFilter, sort]);

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      updateKnowledgeBase(editing.id, { name: editing.name, description: editing.description });
      setEditing(null);
    } else {
      const created = createKnowledgeBase({ name: editing.name, description: editing.description });
      setEditing(null);
      navigate(`/admin/knowledge/${created.id}`);
    }
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateKnowledgeBase(id);
    if (copy) navigate(`/admin/knowledge/${copy.id}`);
  };

  const assignKb = assignFor ? knowledgeBases.find((kb) => kb.id === assignFor) ?? null : null;
  const deleteKb = deleteFor ? knowledgeBases.find((kb) => kb.id === deleteFor) ?? null : null;

  const agentItem = (agentId: string): AssignableItem => {
    const agent = agents.find((item) => item.id === agentId);
    return { id: agentId, name: agent?.name ?? agentId, meta: agent?.status };
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Knowledge"
        description="Create knowledge bases, ingest sources, index them, and assign them to agents."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Knowledge' }]}
        actions={[{ label: '+ Create Knowledge Base', variant: 'primary', onClick: () => setEditing({ id: null, name: '', description: '' }) }]}
      />

      <DemoNotice message="Knowledge Control Center. Ingestion, indexing, and retrieval are simulated demo state until the backend is connected." />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search knowledge bases"
        filters={READINESS_FILTERS}
        activeFilter={readiness}
        onFilterChange={setReadiness}
        actions={
          <>
            <label className="admin-field">
              <select className="admin-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | KnowledgeSourceType)}>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'name')}>
                <option value="updated">Sort: Last updated</option>
                <option value="name">Sort: Name</option>
              </select>
            </label>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={knowledgeBases.length === 0 ? 'No knowledge bases yet' : 'No matches'}
          description={
            knowledgeBases.length === 0
              ? 'Create a knowledge base, add documents, URLs, or FAQs, then index it for agents.'
              : 'Try a different search term or filter.'
          }
          action={
            <Button variant="primary" onClick={() => setEditing({ id: null, name: '', description: '' })}>
              Create Knowledge Base
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
                <th>Agents</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((kb) => {
                const badge = knowledgeReadinessBadge(getKnowledgeReadiness(kb));
                return (
                  <tr key={kb.id}>
                    <td>
                      <button type="button" className="admin-link-cell" onClick={() => navigate(`/admin/knowledge/${kb.id}`)}>
                        {kb.name}
                      </button>
                      <p className="admin-cell-sub">{kb.description || 'No description'}</p>
                    </td>
                    <td>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="admin-cell-sub">{kb.sources.length}</td>
                    <td className="admin-cell-sub">{kb.assignedAgentIds.length}</td>
                    <td className="admin-cell-sub">{kb.updatedAt}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/knowledge/${kb.id}`)}>
                          Open
                        </Button>
                        <RowMenu
                          items={[
                            { label: 'Edit', onClick: () => setEditing({ id: kb.id, name: kb.name, description: kb.description }) },
                            { label: 'Duplicate', onClick: () => handleDuplicate(kb.id) },
                            { label: 'Assign to Agent', onClick: () => setAssignFor(kb.id) },
                            { label: 'Re-index', onClick: () => reindexKnowledgeBase(kb.id) },
                            { label: 'Delete', destructive: true, onClick: () => setDeleteFor(kb.id) },
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
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Knowledge Base' : 'Create Knowledge Base'}
        description={editing?.id ? 'Update the name and description.' : 'Name the knowledge base. Add sources after it is created.'}
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEditing} disabled={!editing?.name.trim()}>
              {editing?.id ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input
            label="Name"
            placeholder="e.g. Product Documentation"
            value={editing?.name ?? ''}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
          />
          <Input
            label="Description"
            placeholder="What this knowledge base covers"
            value={editing?.description ?? ''}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
          />
        </div>
      </Drawer>

      <AssignmentDrawer
        isOpen={assignFor !== null}
        onClose={() => setAssignFor(null)}
        title="Assign to Agents"
        description="Attach this knowledge base to agents. Assignment updates the Knowledge Registry."
        assigned={(assignKb?.assignedAgentIds ?? []).map(agentItem)}
        available={agents.filter((agent) => !(assignKb?.assignedAgentIds ?? []).includes(agent.id)).map((agent) => agentItem(agent.id))}
        onAssign={(agentId) => assignFor && assignAgent(assignFor, agentId)}
        onRemove={(agentId) => assignFor && removeAgent(assignFor, agentId)}
        emptyAssignedLabel="No agents assigned yet."
        emptyAvailableLabel="All agents are assigned."
      />

      <ConfirmDialog
        isOpen={deleteFor !== null}
        title="Delete knowledge base?"
        description={
          deleteKb && deleteKb.assignedAgentIds.length > 0
            ? `This knowledge base is assigned to ${deleteKb.assignedAgentIds.length} agent(s). Deleting it removes those assignments. This cannot be undone.`
            : 'This permanently removes the knowledge base and its sources. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteFor(null)}
        onConfirm={() => {
          if (deleteFor) deleteKnowledgeBase(deleteFor);
          setDeleteFor(null);
        }}
      />
    </div>
  );
}
