import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { useActivity } from '../hooks/useActivity';
import {
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_RESOURCE_LABELS,
  type ActivityCategory,
  type ActivityEvent,
  type ActivityResourceType,
  type ActivityStatus,
} from '../services/activity';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'Info', value: 'info' },
];

const RESOURCE_OPTIONS = Object.entries(ACTIVITY_RESOURCE_LABELS) as [ActivityResourceType, string][];
const CATEGORY_OPTIONS = Object.entries(ACTIVITY_CATEGORY_LABELS) as [ActivityCategory, string][];

type Period = 'all' | 'today' | '7d' | '30d';

const PERIOD_OPTIONS: [Period, string][] = [
  ['all', 'Any time'],
  ['today', 'Today'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
];

function periodStart(period: Period): string | undefined {
  if (period === 'all') return undefined;
  const days = period === 'today' ? 0 : period === '7d' ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function statusVariant(status: ActivityStatus): 'success' | 'danger' | 'info' {
  if (status === 'success') return 'success';
  if (status === 'failure') return 'danger';
  return 'info';
}

export function ActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resourceIdParam = searchParams.get('resourceId') ?? '';
  const resourceTypeParam = (searchParams.get('resourceType') as ActivityResourceType | null) ?? 'all';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all');
  const [resourceType, setResourceType] = useState<ActivityResourceType | 'all'>(resourceTypeParam);
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all');
  const [actor, setActor] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [selected, setSelected] = useState<ActivityEvent | null>(null);

  const query = useMemo(
    () => ({
      search,
      status,
      resourceType,
      category,
      actor,
      resourceId: resourceIdParam || undefined,
      from: periodStart(period),
    }),
    [search, status, resourceType, category, actor, resourceIdParam, period],
  );

  const { events, actors, mode } = useActivity(query);

  const clearResourceScope = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    next.delete('resourceType');
    setSearchParams(next, { replace: true });
    setResourceType('all');
  };

  const scopedName = resourceIdParam ? events[0]?.resourceName ?? resourceIdParam : '';

  return (
    <div className="admin-page">
      <PageHeader
        title="Activity"
        description="Who did what, to which resource, when, and with what result."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Activity' }]}
        actions={[{ label: 'Test Center', variant: 'secondary', href: '/admin/test' }]}
      />

      <DemoNotice
        message={
          mode === 'SIMULATED'
            ? 'DEMO / SIMULATED: Audit events are aggregated from in-memory registry state. Nothing is persisted yet.'
            : 'REAL / CONNECTED: Audit events are served by the backend.'
        }
      />

      {resourceIdParam && (
        <div className="admin-detail-statusbar">
          <Badge variant="info">Scoped</Badge>
          <span className="admin-cell-sub">Showing activity for {scopedName}</span>
          <div className="admin-detail-statusbar-actions">
            <Button variant="ghost" size="sm" onClick={clearResourceScope}>
              Clear scope
            </Button>
          </div>
        </div>
      )}

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search activity"
        filters={STATUS_FILTERS}
        activeFilter={status}
        onFilterChange={(value) => setStatus(value as ActivityStatus | 'all')}
        actions={
          <>
            <label className="admin-field">
              <select
                className="admin-select"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ActivityResourceType | 'all')}
              >
                <option value="all">All resources</option>
                {RESOURCE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <select
                className="admin-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory | 'all')}
              >
                <option value="all">All actions</option>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <select className="admin-select" value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="all">All actors</option>
                {actors.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <select className="admin-select" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                {PERIOD_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="admin-toolbar-filters">
              <button
                type="button"
                className={`admin-filter-chip ${view === 'table' ? 'is-active' : ''}`}
                onClick={() => setView('table')}
              >
                Table
              </button>
              <button
                type="button"
                className={`admin-filter-chip ${view === 'timeline' ? 'is-active' : ''}`}
                onClick={() => setView('timeline')}
              >
                Timeline
              </button>
            </div>
          </>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title="No activity found"
          description="Adjust the filters, or perform an action in Agents, Knowledge, Tools, or Test Center."
        />
      ) : view === 'table' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Result</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="admin-cell-sub">{event.timestamp}</td>
                  <td className="admin-cell-sub">{event.actor}</td>
                  <td>
                    <p className="admin-cell-title">{event.summary}</p>
                    <p className="admin-cell-sub">{ACTIVITY_CATEGORY_LABELS[event.category]}</p>
                  </td>
                  <td>
                    <p className="admin-cell-sub">
                      {ACTIVITY_RESOURCE_LABELS[event.resourceType]} · {event.resourceName}
                    </p>
                  </td>
                  <td>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                        Details
                      </Button>
                      <Link to={event.href} className="btn btn-ghost">Open</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="admin-timeline">
          {events.map((event) => (
            <li key={event.id} className="admin-timeline-item">
              <span className="admin-timeline-dot" aria-hidden="true" />
              <div>
                <div className="cp-attention-title-row">
                  <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  <p className="admin-cell-title">{event.summary}</p>
                </div>
                <p className="admin-cell-sub">
                  {event.actor} · {ACTIVITY_RESOURCE_LABELS[event.resourceType]} · {event.resourceName} · {event.timestamp}
                </p>
                <div className="admin-row-actions" style={{ marginTop: '0.35rem' }}>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                    Details
                  </Button>
                  <Link to={event.href} className="btn btn-ghost">Open</Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Drawer
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="Activity event"
        description={selected?.summary}
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {selected && (
              <Link to={selected.href} className="btn btn-primary">
                Open {ACTIVITY_RESOURCE_LABELS[selected.resourceType].toLowerCase()}
              </Link>
            )}
          </div>
        }
      >
        {selected && (
          <div className="admin-detail-body">
            <div className="admin-detail-statusbar">
              <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
              {selected.isSimulated && <Badge variant="info">SIMULATED</Badge>}
              <span className="admin-cell-sub">{selected.timestamp}</span>
            </div>

            <section className="admin-detail-section">
              <h3 className="admin-section-title">Event</h3>
              <dl className="admin-detail-grid">
                <div className="admin-detail-item"><dt>Actor</dt><dd>{selected.actor}</dd></div>
                <div className="admin-detail-item"><dt>Action</dt><dd>{selected.action}</dd></div>
                <div className="admin-detail-item"><dt>Category</dt><dd>{ACTIVITY_CATEGORY_LABELS[selected.category]}</dd></div>
                <div className="admin-detail-item"><dt>Resource type</dt><dd>{ACTIVITY_RESOURCE_LABELS[selected.resourceType]}</dd></div>
                <div className="admin-detail-item"><dt>Resource</dt><dd>{selected.resourceName}</dd></div>
                <div className="admin-detail-item"><dt>Resource ID</dt><dd>{selected.resourceId}</dd></div>
              </dl>
            </section>

            <section className="admin-detail-section">
              <h3 className="admin-section-title">Metadata</h3>
              <dl className="admin-detail-grid">
                {Object.entries(selected.metadata).map(([key, value]) => (
                  <div key={key} className="admin-detail-item">
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
