import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { TestTrace } from '../components/TestTrace';
import { useTestRuns } from '../hooks/useTestRuns';
import { TEST_ENVIRONMENT_LABELS, TEST_TYPE_LABELS } from '../services/testCenter';

export function TestRunDetailPage() {
  const { runId = '' } = useParams();
  const { getRunById } = useTestRuns();
  const run = getRunById(runId);

  if (!run) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Test run not found"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Test Center', href: '/admin/test' },
            { label: 'Not found' },
          ]}
        />
        <EmptyState
          title="This test run is no longer available"
          description="Run history is demo state and resets on reload."
          action={
            <Link to="/admin/test">
              <Button variant="primary">Back to Test Center</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const details: { label: string; value: string }[] = [
    { label: 'Agent', value: run.agentName },
    { label: 'Test type', value: TEST_TYPE_LABELS[run.request.testType] },
    { label: 'Version', value: run.request.versionLabel },
    { label: 'Environment', value: TEST_ENVIRONMENT_LABELS[run.request.environment] },
    { label: 'Mode', value: run.mode },
    { label: 'Total latency', value: `${run.totalLatencyMs} ms` },
    { label: 'Started at', value: run.startedAt },
    { label: 'Errors', value: String(run.errors.length) },
  ];

  return (
    <div className="admin-page">
      <PageHeader
        title="Test run"
        description={run.request.input}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Test Center', href: '/admin/test' },
          { label: run.agentName },
        ]}
        actions={[
          { label: 'Open agent', variant: 'secondary', href: `/admin/agents/${run.request.agentId}` },
          { label: 'Run another test', variant: 'primary', href: `/admin/test?agent=${run.request.agentId}` },
        ]}
      />

      <div className="admin-detail-statusbar">
        <Badge variant={run.status === 'passed' ? 'success' : 'danger'}>{run.status.toUpperCase()}</Badge>
        <Badge variant="info">{run.mode}</Badge>
        <span className="admin-cell-sub">{run.totalLatencyMs} ms</span>
        <span className="admin-cell-sub">{run.startedAt}</span>
      </div>

      {run.errors.length > 0 && <ErrorState title="Test failed" description={run.errors.join(' ')} />}

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Summary</h3>
        <dl className="admin-detail-grid">
          {details.map((item) => (
            <div key={item.label} className="admin-detail-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Output</h3>
        <pre className="cp-code-block">{run.output}</pre>
      </section>

      <section className="admin-detail-section">
        <h3 className="admin-section-title">Execution trace</h3>
        <TestTrace result={run} />
      </section>
    </div>
  );
}
