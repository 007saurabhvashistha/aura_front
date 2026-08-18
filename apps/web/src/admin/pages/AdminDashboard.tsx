import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { DemoNotice } from '../components/DemoNotice';
import { useAgentRegistry } from '../hooks/useAgentRegistry';
import { useIntegrationRegistry } from '../hooks/useIntegrationRegistry';
import { useKnowledgeRegistry } from '../hooks/useKnowledgeRegistry';
import { useToolRegistry } from '../hooks/useToolRegistry';
import { useTestRuns } from '../hooks/useTestRuns';
import {
  demoControlPlaneOverviewService,
  type AttentionItem,
  type ControlPlaneDomainHealth,
  type ControlPlaneMetric,
  type HealthLevel,
  type IntegrationHealthRow,
  type OperationalHealthCard,
  type RecentActivityItem,
} from '../services/controlPlane';

function healthBadge(level: HealthLevel): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (level === 'critical') return { label: 'Critical', variant: 'danger' };
  if (level === 'attention') return { label: 'Attention required', variant: 'warning' };
  return { label: 'Healthy', variant: 'success' };
}

function severityBadge(severity: AttentionItem['severity']): { label: string; variant: 'danger' | 'warning' | 'info' } {
  if (severity === 'critical') return { label: 'Critical', variant: 'danger' };
  if (severity === 'warning') return { label: 'Warning', variant: 'warning' };
  return { label: 'Info', variant: 'info' };
}

function HealthDomainCard({ domain }: { domain: ControlPlaneDomainHealth }) {
  const badge = healthBadge(domain.level);
  return (
    <Link className="cp-health-card" to={domain.href}>
      <div className="cp-health-card-head">
        <p className="cp-health-card-title">{domain.label}</p>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="cp-health-card-summary">{domain.summary}</p>
      <p className="cp-health-card-reason">{domain.reason}</p>
    </Link>
  );
}

function MetricCard({ metric }: { metric: ControlPlaneMetric }) {
  const content = (
    <Card variant="metric" className="cp-kpi-card">
      <p className="cp-kpi-label">{metric.label}</p>
      <p className="cp-kpi-value">{metric.value}</p>
      <p className="cp-kpi-note">{metric.note}</p>
      {metric.isDemo && (
        <div className="cp-kpi-demo-row">
          <Badge variant="info">Demo metric</Badge>
        </div>
      )}
    </Card>
  );

  if (metric.href) {
    return (
      <Link to={metric.href} className="cp-kpi-link">
        {content}
      </Link>
    );
  }

  return content;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const badge = severityBadge(item.severity);
  return (
    <li className="cp-attention-item">
      <div className="cp-attention-main">
        <div className="cp-attention-title-row">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <p className="cp-attention-title">{item.resourceType} · {item.resourceName}</p>
        </div>
        <p className="cp-attention-reason">{item.reason}</p>
        {item.timestamp && <p className="cp-attention-time">{item.timestamp}</p>}
      </div>
      <Link to={item.href} className="btn btn-ghost cp-attention-action">
        {item.ctaLabel}
      </Link>
    </li>
  );
}

function OperationalHealthCardView({ card }: { card: OperationalHealthCard }) {
  const total = Math.max(card.segments.reduce((sum, segment) => sum + segment.count, 0), 1);
  return (
    <Card
      title={card.title}
      variant="default"
      footer={
        <Link to={card.href} className="cp-card-footer-link">
          View all →
        </Link>
      }
    >
      <div className="cp-dist-bar" role="presentation">
        {card.segments.map((segment) => (
          <div
            key={segment.key}
            className={`cp-dist-segment is-${segment.key}`}
            style={{ width: `${(segment.count / total) * 100}%` }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
      <ul className="cp-dist-list">
        {card.segments.map((segment) => (
          <li key={segment.key}>
            <span>{segment.label}</span>
            <strong>{segment.count}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ActivityList({ activities }: { activities: RecentActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Agent and workspace activity will appear here."
      />
    );
  }

  return (
    <ol className="cp-activity-list">
      {activities.map((activity) => (
        <li key={activity.id} className="cp-activity-item">
          <div>
            <p className="cp-activity-title">{activity.message}</p>
            <p className="cp-activity-meta">
              {activity.resourceName} · {activity.timestamp}
            </p>
          </div>
          <div className="cp-activity-actions">
            {activity.isDemo && <Badge variant="info">Demo</Badge>}
            <Link to={activity.href} className="btn btn-ghost">Open</Link>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IntegrationHealthTable({ rows }: { rows: IntegrationHealthRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No integration usage yet"
        description="Integration status will appear when providers are configured and mapped to agents."
      />
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Capability</th>
            <th>Status</th>
            <th>Agents</th>
            <th>Last tested</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.integrationId}>
              <td>
                <p className="admin-cell-title">{row.provider}</p>
                <p className="admin-cell-sub">{row.name}</p>
              </td>
              <td className="admin-cell-sub">{row.capability}</td>
              <td>
                <Badge variant={row.status === 'connected' ? 'success' : 'warning'}>{row.status}</Badge>
              </td>
              <td className="admin-cell-sub">{row.agentsUsing}</td>
              <td className="admin-cell-sub">{row.lastTested}</td>
              <td>
                <Link to={row.href} className="btn btn-ghost">Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboard() {
  const { agents } = useAgentRegistry();
  const { agents: integrationBindings, integrations } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();
  const { runs } = useTestRuns();

  const overview = useMemo(
    () =>
      demoControlPlaneOverviewService.createOverview({
        agents,
        integrationBindings,
        integrations,
        knowledgeBases,
        tools,
        testRuns: runs,
      }),
    [agents, integrationBindings, integrations, knowledgeBases, tools, runs],
  );

  const attentionItems = [
    ...overview.attention.critical,
    ...overview.attention.warning,
    ...overview.attention.info,
  ].slice(0, 10);

  const overallBadge = healthBadge(overview.overallHealth);

  if (!overview) {
    return (
      <div className="admin-page">
        <ErrorState description="Unable to build control-plane overview." />
      </div>
    );
  }

  return (
    <div className="admin-page cp-overview">
      <PageHeader
        title="Control Center"
        description="Monitor and manage your Aura workspace."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Control Center' }]}
        actions={[
          { label: 'Create Agent', variant: 'primary', href: '/admin/agents/create' },
          { label: 'Test Center', variant: 'secondary', href: '/admin/test' },
          { label: 'View Activity', variant: 'ghost', href: '/admin/activity' },
        ]}
      />

      <section className="cp-health-strip">
        <div className="cp-health-strip-head">
          <h3>Platform Health</h3>
          <Badge variant={overallBadge.variant}>{overallBadge.label}</Badge>
        </div>
        <div className="cp-health-grid">
          {overview.domains.map((domain) => (
            <HealthDomainCard key={domain.key} domain={domain} />
          ))}
        </div>
      </section>

      <section className="cp-kpi-grid">
        {overview.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section>
        <DemoNotice message="Some runtime and cost metrics below are SIMULATED demo adapter values until backend telemetry is connected." />
        <div className="cp-kpi-grid cp-kpi-grid-demo">
          {overview.simulatedMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <section className="cp-main-grid">
        <Card title="Attention Required" description="Issues that may require action.">
          {attentionItems.length === 0 ? (
            <EmptyState
              title="All systems operational"
              description="Nothing requires your attention right now."
            />
          ) : (
            <ul className="cp-attention-list">
              {attentionItems.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Activity" description="Aggregated from agent, knowledge, and integration state.">
          <ActivityList activities={overview.recentActivity} />
        </Card>
      </section>

      <section>
        <div className="cp-section-head">
          <h3>Operational Health</h3>
        </div>
        <div className="cp-operational-grid">
          {overview.operationalHealth.map((card) => (
            <OperationalHealthCardView key={card.key} card={card} />
          ))}
        </div>
      </section>

      <section>
        <div className="cp-section-head">
          <h3>Agent Activity Summary</h3>
        </div>
        {overview.agentSummary.length === 0 ? (
          <EmptyState
            title="No agents yet"
            description="Create your first AI agent to start operating Aura."
            action={<Link to="/admin/agents/create" className="btn btn-primary">Create Agent</Link>}
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Integrations</th>
                  <th>Knowledge</th>
                  <th>Tools</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {overview.agentSummary.map((row) => (
                  <tr key={row.agentId}>
                    <td>
                      <Link to={`/admin/agents/${row.agentId}`} className="admin-link-cell">{row.agentName}</Link>
                    </td>
                    <td>
                      <Badge variant={row.status === 'published' ? 'success' : row.status === 'disabled' ? 'warning' : 'info'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="admin-cell-sub">{row.version}</td>
                    <td className="admin-cell-sub">{row.integrationSummary}</td>
                    <td className="admin-cell-sub">{row.knowledgeSummary}</td>
                    <td className="admin-cell-sub">{row.toolSummary}</td>
                    <td className="admin-cell-sub">{row.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="cp-section-head">
          <h3>Integration Health</h3>
        </div>
        <IntegrationHealthTable rows={overview.integrationHealth} />
      </section>
    </div>
  );
}
