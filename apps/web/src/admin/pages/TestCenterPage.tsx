import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { DemoNotice } from '../components/DemoNotice';
import { TestTrace } from '../components/TestTrace';
import { useAgentRegistry } from '../hooks/useAgentRegistry';
import { useTestRuns } from '../hooks/useTestRuns';
import {
  TEST_ENVIRONMENT_LABELS,
  TEST_TYPE_LABELS,
  type TestEnvironment,
  type TestRunResult,
  type TestType,
} from '../services/testCenter';

const TABS = [
  { label: 'Run test', value: 'run' },
  { label: 'History', value: 'history' },
];

const TEST_TYPES = Object.entries(TEST_TYPE_LABELS) as [TestType, string][];
const ENVIRONMENTS = Object.entries(TEST_ENVIRONMENT_LABELS) as [TestEnvironment, string][];

export function TestCenterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { agents } = useAgentRegistry();
  const { runs, mode, runTest } = useTestRuns();

  const tab = searchParams.get('tab') ?? 'run';
  const presetAgentId = searchParams.get('agent') ?? '';

  const [agentId, setAgentId] = useState(presetAgentId || agents[0]?.id || '');
  const [versionLabel, setVersionLabel] = useState('');
  const [environment, setEnvironment] = useState<TestEnvironment>('demo');
  const [testType, setTestType] = useState<TestType>('conversation');
  const [input, setInput] = useState('What is your refund policy?');
  const [result, setResult] = useState<TestRunResult | null>(null);

  const agent = agents.find((item) => item.id === agentId) ?? null;
  const versions = useMemo(() => agent?.versions ?? [], [agent]);
  const activeVersion = versionLabel || agent?.publishedVersion || versions[0]?.label || 'draft';

  const canRun = Boolean(agent) && input.trim().length > 0;

  const handleRun = () => {
    if (!agent) return;
    const run = runTest({
      agentId: agent.id,
      versionLabel: activeVersion,
      environment,
      testType,
      input: input.trim(),
    });
    setResult(run);
  };

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Test Center"
        description="Validate agents, tools, knowledge, and integrations before they reach production."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Test Center' }]}
        actions={[{ label: 'Agents', variant: 'secondary', href: '/admin/agents' }]}
      />

      <DemoNotice
        message={
          mode === 'SIMULATED'
            ? 'DEMO / SIMULATED: Tests run against registry state only. No runtime, provider, or network call is executed.'
            : 'REAL / CONNECTED: Tests execute against the connected runtime.'
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'run' && (
        <>
          {agents.length === 0 ? (
            <EmptyState
              title="No agents to test"
              description="Create an agent first, then attach knowledge, tools, and integrations."
              action={
                <Link to="/admin/agents/create" className="btn btn-primary">
                  Create Agent
                </Link>
              }
            />
          ) : (
            <section className="admin-detail-section">
              <h3 className="admin-section-title">Test target</h3>
              <div className="tc-selector-grid">
                <label className="admin-field">
                  <span className="admin-field-label">Agent</span>
                  <select
                    className="admin-select"
                    value={agentId}
                    onChange={(e) => {
                      setAgentId(e.target.value);
                      setVersionLabel('');
                    }}
                  >
                    {agents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.status})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span className="admin-field-label">Version</span>
                  <select className="admin-select" value={activeVersion} onChange={(e) => setVersionLabel(e.target.value)}>
                    {versions.map((version) => (
                      <option key={version.id} value={version.label}>
                        {version.label} ({version.status})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span className="admin-field-label">Environment</span>
                  <select
                    className="admin-select"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as TestEnvironment)}
                  >
                    {ENVIRONMENTS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span className="admin-field-label">Test type</span>
                  <select className="admin-select" value={testType} onChange={(e) => setTestType(e.target.value as TestType)}>
                    {TEST_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-form" style={{ marginTop: '1rem' }}>
                <Input
                  label="Test input"
                  placeholder="e.g. What is your refund policy?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <div className="admin-row-actions">
                  <Button variant="primary" onClick={handleRun} disabled={!canRun}>
                    Run test
                  </Button>
                  {agent && (
                    <Link to={`/admin/agents/${agent.id}`} className="btn btn-ghost">
                      Open agent
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {result && (
            <section className="admin-detail-section">
              <div className="admin-detail-inline">
                <div>
                  <h3 className="admin-section-title">Result</h3>
                  <p className="admin-cell-sub">
                    {result.agentName} · {TEST_TYPE_LABELS[result.request.testType]} · {result.request.versionLabel} ·{' '}
                    {TEST_ENVIRONMENT_LABELS[result.request.environment]}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <Badge variant={result.status === 'passed' ? 'success' : 'danger'}>
                    {result.status.toUpperCase()}
                  </Badge>
                  <Badge variant="info">{result.mode}</Badge>
                  <Link to={`/admin/test/runs/${result.id}`} className="btn btn-ghost">
                    Open run
                  </Link>
                </div>
              </div>

              <dl className="admin-detail-grid">
                <div className="admin-detail-item"><dt>Total latency</dt><dd>{result.totalLatencyMs} ms</dd></div>
                <div className="admin-detail-item"><dt>Started at</dt><dd>{result.startedAt}</dd></div>
                <div className="admin-detail-item"><dt>Errors</dt><dd>{result.errors.length}</dd></div>
              </dl>

              {result.errors.length > 0 && <ErrorState title="Test failed" description={result.errors.join(' ')} />}

              <h3 className="admin-section-title" style={{ marginTop: '1rem' }}>Execution trace</h3>
              <TestTrace result={result} />
            </section>
          )}
        </>
      )}

      {tab === 'history' && (
        <section>
          {runs.length === 0 ? (
            <EmptyState
              title="No test runs yet"
              description="Run a test to build up execution history for this workspace."
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Type</th>
                    <th>Version</th>
                    <th>Environment</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Started</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <button
                          type="button"
                          className="admin-link-cell"
                          onClick={() => navigate(`/admin/test/runs/${run.id}`)}
                        >
                          {run.agentName}
                        </button>
                      </td>
                      <td className="admin-cell-sub">{TEST_TYPE_LABELS[run.request.testType]}</td>
                      <td className="admin-cell-sub">{run.request.versionLabel}</td>
                      <td className="admin-cell-sub">{TEST_ENVIRONMENT_LABELS[run.request.environment]}</td>
                      <td>
                        <Badge variant={run.status === 'passed' ? 'success' : 'danger'}>{run.status}</Badge>
                      </td>
                      <td className="admin-cell-sub">{run.totalLatencyMs} ms</td>
                      <td className="admin-cell-sub">{run.startedAt}</td>
                      <td>
                        <Link to={`/admin/test/runs/${run.id}`} className="btn btn-ghost">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
