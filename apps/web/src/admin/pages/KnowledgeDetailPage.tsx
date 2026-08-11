import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowMenu } from '../components/RowMenu';
import { AssignmentDrawer, type AssignableItem } from '../components/AssignmentDrawer';
import { knowledgeReadinessBadge, sourceStatusBadge } from '../components/statusMaps';
import {
  useKnowledgeRegistry,
  getKnowledgeReadiness,
  knowledgeReadinessReason,
  KNOWLEDGE_SOURCE_TYPE_LABELS,
  type KnowledgeBase,
  type KnowledgeSourceType,
} from '../hooks/useKnowledgeRegistry';
import { useAgentRegistry } from '../hooks/useAgentRegistry';

const TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Sources', value: 'sources' },
  { label: 'Processing', value: 'processing' },
  { label: 'Agents', value: 'agents' },
  { label: 'Test', value: 'test' },
  { label: 'Activity', value: 'activity' },
];

export function KnowledgeDetailPage() {
  const { knowledgeId = '', tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab ?? 'overview';

  const {
    getKnowledgeBaseById,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    duplicateKnowledgeBase,
    disableKnowledgeBase,
    enableKnowledgeBase,
    reindexKnowledgeBase,
  } = useKnowledgeRegistry();

  const [editing, setEditing] = useState<{ name: string; description: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kb = getKnowledgeBaseById(knowledgeId);

  if (!kb) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Knowledge base not found"
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Knowledge', href: '/admin/knowledge' }, { label: 'Not found' }]}
        />
        <EmptyState
          title="This knowledge base does not exist"
          description="It may have been deleted or the link is out of date."
          action={
            <Link to="/admin/knowledge">
              <Button variant="primary">Back to Knowledge</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const readiness = getKnowledgeReadiness(kb);
  const badge = knowledgeReadinessBadge(readiness);

  const lifecycleItems: { label: string; onClick: () => void; destructive?: boolean }[] = [
    { label: 'Edit', onClick: () => setEditing({ name: kb.name, description: kb.description }) },
    { label: 'Duplicate', onClick: () => { const copy = duplicateKnowledgeBase(kb.id); if (copy) navigate(`/admin/knowledge/${copy.id}`); } },
    kb.disabled
      ? { label: 'Enable', onClick: () => enableKnowledgeBase(kb.id) }
      : { label: 'Disable', onClick: () => disableKnowledgeBase(kb.id) },
    { label: 'Delete', destructive: true, onClick: () => setConfirmDelete(true) },
  ];

  return (
    <div className="admin-page">
      <PageHeader
        title={kb.name}
        description={kb.description}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Knowledge', href: '/admin/knowledge' },
          { label: kb.name },
        ]}
        actions={[{ label: 'Re-index', variant: 'primary', onClick: () => reindexKnowledgeBase(kb.id) }]}
      />

      <div className="admin-detail-statusbar">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="admin-cell-sub">{knowledgeReadinessReason(readiness)}</span>
        <span className="admin-cell-sub">Sources: {kb.sources.length}</span>
        <span className="admin-cell-sub">Agents: {kb.assignedAgentIds.length}</span>
        <div className="admin-detail-statusbar-actions">
          <RowMenu items={lifecycleItems} label="Knowledge actions" />
        </div>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={(value) => navigate(`/admin/knowledge/${kb.id}/${value}`)} />

      {activeTab === 'overview' && <OverviewTab kb={kb} />}
      {activeTab === 'sources' && <SourcesTab kb={kb} />}
      {activeTab === 'processing' && <ProcessingTab kb={kb} />}
      {activeTab === 'agents' && <AgentsTab kb={kb} />}
      {activeTab === 'test' && <TestTab kb={kb} />}
      {activeTab === 'activity' && <ActivityTab kb={kb} />}

      <Drawer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Knowledge Base"
        description="Update the name and description."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!editing?.name.trim()}
              onClick={() => {
                if (editing?.name.trim()) updateKnowledgeBase(kb.id, editing);
                setEditing(null);
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input label="Name" value={editing?.name ?? ''} onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
          <Input label="Description" value={editing?.description ?? ''} onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))} />
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete knowledge base?"
        description={
          kb.assignedAgentIds.length > 0
            ? `This knowledge base is assigned to ${kb.assignedAgentIds.length} agent(s). Deleting removes those assignments. This cannot be undone.`
            : 'This permanently removes the knowledge base and its sources. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteKnowledgeBase(kb.id);
          navigate('/admin/knowledge');
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Overview */

function OverviewTab({ kb }: { kb: KnowledgeBase }) {
  const readiness = getKnowledgeReadiness(kb);
  const items: { label: string; value: string }[] = [
    { label: 'Description', value: kb.description || '—' },
    { label: 'Readiness', value: readiness },
    { label: 'Index status', value: kb.indexStatus },
    { label: 'Sources', value: String(kb.sources.length) },
    { label: 'Assigned agents', value: String(kb.assignedAgentIds.length) },
    { label: 'Visibility', value: kb.metadata.visibility },
    { label: 'Last indexed', value: kb.lastIndexedAt ?? 'Never' },
    { label: 'Created', value: kb.createdAt },
    { label: 'Last updated', value: kb.updatedAt },
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

/* ------------------------------------------------------------------- Sources */

const SOURCE_TYPES: KnowledgeSourceType[] = ['document', 'url', 'text', 'faq'];

function SourcesTab({ kb }: { kb: KnowledgeBase }) {
  const { addSource, updateSource, removeSource, retrySource, disableSource, enableSource, reindexSource } = useKnowledgeRegistry();
  const [addOpen, setAddOpen] = useState(false);
  const [type, setType] = useState<KnowledgeSourceType>('document');
  const [title, setTitle] = useState('');
  const [editSource, setEditSource] = useState<{ id: string; title: string } | null>(null);
  const [removeSourceId, setRemoveSourceId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim()) return;
    addSource(kb.id, { type, title });
    setTitle('');
    setType('document');
    setAddOpen(false);
  };

  return (
    <div className="admin-detail-body">
      <div className="admin-detail-inline">
        <h3 className="admin-section-title">Sources</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>Add Source</Button>
      </div>

      {kb.sources.length === 0 ? (
        <EmptyState
          title="No sources yet"
          description="Add documents, URLs, text, or FAQs, then index this knowledge base."
          action={<Button variant="primary" onClick={() => setAddOpen(true)}>Add Source</Button>}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Status</th>
                <th>Size</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {kb.sources.map((source) => {
                const badge = sourceStatusBadge(source.status);
                const items: { label: string; onClick: () => void; destructive?: boolean }[] = [
                  { label: 'Edit', onClick: () => setEditSource({ id: source.id, title: source.title }) },
                  { label: 'Re-index', onClick: () => reindexSource(kb.id, source.id) },
                ];
                if (source.status === 'failed') items.push({ label: 'Retry', onClick: () => retrySource(kb.id, source.id) });
                if (source.status === 'disabled') items.push({ label: 'Enable', onClick: () => enableSource(kb.id, source.id) });
                else items.push({ label: 'Disable', onClick: () => disableSource(kb.id, source.id) });
                items.push({ label: 'Remove', destructive: true, onClick: () => setRemoveSourceId(source.id) });
                return (
                  <tr key={source.id}>
                    <td className="admin-cell-title">{source.title}</td>
                    <td className="admin-cell-sub">{KNOWLEDGE_SOURCE_TYPE_LABELS[source.type]}</td>
                    <td><Badge variant={badge.variant}>{badge.label}</Badge></td>
                    <td className="admin-cell-sub">{source.sizeLabel ?? '—'}</td>
                    <td className="admin-cell-sub">{source.updatedAt}</td>
                    <td>
                      <div className="admin-row-actions">
                        <RowMenu items={items} />
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
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Source"
        description="Choose a source type and give it a title. Indexing is simulated in demo mode."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={!title.trim()}>Add</Button>
          </div>
        }
      >
        <div className="admin-form">
          <label className="admin-field">
            <span className="admin-field-label">Type</span>
            <select className="admin-select" value={type} onChange={(e) => setType(e.target.value as KnowledgeSourceType)}>
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>{KNOWLEDGE_SOURCE_TYPE_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <Input label="Title" placeholder="e.g. refund-policy.pdf or https://…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </Drawer>

      <Drawer
        isOpen={editSource !== null}
        onClose={() => setEditSource(null)}
        title="Edit Source"
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setEditSource(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!editSource?.title.trim()}
              onClick={() => {
                if (editSource?.title.trim()) updateSource(kb.id, editSource.id, { title: editSource.title });
                setEditSource(null);
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input label="Title" value={editSource?.title ?? ''} onChange={(e) => setEditSource((prev) => (prev ? { ...prev, title: e.target.value } : prev))} />
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={removeSourceId !== null}
        title="Remove source?"
        description="This removes the source from the knowledge base. This cannot be undone."
        confirmLabel="Remove"
        destructive
        onCancel={() => setRemoveSourceId(null)}
        onConfirm={() => {
          if (removeSourceId) removeSource(kb.id, removeSourceId);
          setRemoveSourceId(null);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Processing */

function ProcessingTab({ kb }: { kb: KnowledgeBase }) {
  const { startIndexing } = useKnowledgeRegistry();
  const readiness = getKnowledgeReadiness(kb);
  const badge = knowledgeReadinessBadge(readiness);
  const active = kb.sources.filter((source) => source.status !== 'disabled');
  const indexed = active.filter((source) => source.status === 'indexed').length;
  const failed = active.filter((source) => source.status === 'failed').length;
  const inProgress = active.filter((source) => source.status === 'processing' || source.status === 'pending').length;

  const stats: { label: string; value: string }[] = [
    { label: 'Total sources', value: String(kb.sources.length) },
    { label: 'Indexed', value: String(indexed) },
    { label: 'Failed', value: String(failed) },
    { label: 'In progress', value: String(inProgress) },
    { label: 'Last indexed', value: kb.lastIndexedAt ?? 'Never' },
  ];

  return (
    <div className="admin-detail-body">
      <DemoNotice message="Indexing is simulated — no real ingestion or vector processing runs in demo mode." />
      <section className="admin-detail-section">
        <div className="admin-detail-inline">
          <div>
            <h3 className="admin-section-title">Processing</h3>
            <p className="admin-cell-sub">{knowledgeReadinessReason(readiness)}</p>
          </div>
          <div className="admin-row-actions">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Button variant="primary" size="sm" onClick={() => startIndexing(kb.id)} disabled={kb.sources.length === 0}>
              Start indexing
            </Button>
          </div>
        </div>
        <dl className="admin-detail-grid">
          {stats.map((item) => (
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

/* -------------------------------------------------------------------- Agents */

function AgentsTab({ kb }: { kb: KnowledgeBase }) {
  const { assignAgent, removeAgent } = useKnowledgeRegistry();
  const { agents } = useAgentRegistry();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const assigned = agents.filter((agent) => kb.assignedAgentIds.includes(agent.id));
  const available = agents.filter((agent) => !kb.assignedAgentIds.includes(agent.id));
  const item = (agentId: string): AssignableItem => {
    const agent = agents.find((entry) => entry.id === agentId);
    return { id: agentId, name: agent?.name ?? agentId, meta: agent?.status };
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
          description="Assign this knowledge base to agents so they can retrieve from it."
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
                      <Link to={`/admin/agents/${agent.id}`} className="btn btn-ghost">Open</Link>
                      <Button variant="ghost" size="sm" onClick={() => removeAgent(kb.id, agent.id)}>Remove</Button>
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
        description="Attach this knowledge base to agents. Assignment updates the Knowledge Registry."
        assigned={assigned.map((agent) => item(agent.id))}
        available={available.map((agent) => item(agent.id))}
        onAssign={(agentId) => assignAgent(kb.id, agentId)}
        onRemove={(agentId) => removeAgent(kb.id, agentId)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- Test */

function TestTab({ kb }: { kb: KnowledgeBase }) {
  const readiness = getKnowledgeReadiness(kb);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ question: string; source: string; confidence: string; answer: string } | null>(null);

  const run = () => {
    if (!question.trim()) return;
    const indexed = kb.sources.filter((source) => source.status === 'indexed');
    const source = indexed[0]?.title ?? 'No indexed source';
    setResult({
      question: question.trim(),
      source,
      confidence: readiness === 'READY' ? 'High (demo)' : 'Low (demo)',
      answer:
        readiness === 'READY'
          ? `Based on "${source}", here is a simulated grounded answer for: ${question.trim()}`
          : 'This knowledge base is not ready, so no grounded answer can be simulated.',
    });
  };

  return (
    <div className="admin-detail-body">
      <DemoNotice message="Demo retrieval — runtime/API not connected. This is a UX/contract prototype, not real vector search or RAG." />
      <section className="admin-detail-section">
        <h3 className="admin-section-title">Test retrieval</h3>
        <div className="admin-form">
          <Input label="Question" placeholder="e.g. What is your refund policy?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div>
            <Button variant="primary" onClick={run} disabled={!question.trim()}>Run test</Button>
          </div>
        </div>
      </section>

      {result && (
        <section className="admin-detail-section">
          <h3 className="admin-section-title">Result</h3>
          <dl className="admin-detail-grid">
            <div className="admin-detail-item"><dt>Query</dt><dd>{result.question}</dd></div>
            <div className="admin-detail-item"><dt>Knowledge base</dt><dd>{kb.name}</dd></div>
            <div className="admin-detail-item"><dt>Retrieved source</dt><dd>{result.source}</dd></div>
            <div className="admin-detail-item"><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          </dl>
          <p className="admin-cell-sub" style={{ marginTop: '0.75rem' }}>{result.answer}</p>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Activity */

function ActivityTab({ kb }: { kb: KnowledgeBase }) {
  return (
    <div className="admin-detail-body">
      <DemoNotice message="Activity timeline is demo state. Live activity will stream from the backend once connected." />
      <ol className="admin-timeline">
        {kb.activity.map((entry) => (
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
