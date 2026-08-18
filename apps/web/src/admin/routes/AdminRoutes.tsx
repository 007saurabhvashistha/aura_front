import { Route, Routes } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';
import { AdminLayout } from '../components/AdminLayout';
import { IntegrationRegistryProvider } from '../hooks/useIntegrationRegistry';
import { KnowledgeRegistryProvider } from '../hooks/useKnowledgeRegistry';
import { ToolRegistryProvider } from '../hooks/useToolRegistry';
import { AgentRegistryProvider } from '../hooks/useAgentRegistry';
import { TestRunsProvider } from '../hooks/useTestRuns';
import { AdminDashboard } from '../pages/AdminDashboard';
import { AdminModulePage } from '../pages/AdminModulePage';
import { AgentBuilderPage } from '../pages/AgentBuilderPage';
import { AgentDetailPage } from '../pages/AgentDetailPage';
import { UsersPage } from '../pages/UsersPage';
import { AgentsPage } from '../pages/AgentsPage';
import { KnowledgePage } from '../pages/KnowledgePage';
import { KnowledgeDetailPage } from '../pages/KnowledgeDetailPage';
import { ToolsPage } from '../pages/ToolsPage';
import { ToolDetailPage } from '../pages/ToolDetailPage';
import { TeamPage } from '../pages/TeamPage';
import { IntegrationsPage } from '../pages/IntegrationsPage';
import { ConversationsPage } from '../pages/ConversationsPage';
import { SessionsPage } from '../pages/SessionsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LogsPage } from '../pages/LogsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ActivityPage } from '../pages/ActivityPage';
import { TestCenterPage } from '../pages/TestCenterPage';
import { TestRunDetailPage } from '../pages/TestRunDetailPage';

export function AdminRoutes() {
  return (
    <AdminRoute>
      <IntegrationRegistryProvider>
        <KnowledgeRegistryProvider>
          <ToolRegistryProvider>
            <AgentRegistryProvider>
              <TestRunsProvider>
                <AdminLayout>
                <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/agents/create" element={<AgentBuilderPage />} />
          <Route path="/agents/:agentId/edit" element={<AgentBuilderPage />} />
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
          <Route path="/agents/:agentId/:tab" element={<AgentDetailPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route
            path="/users/roles"
            element={
              <AdminModulePage
                title="Roles"
                subtitle="Define operational role templates for admin and support teams."
                actions={[{ label: 'Create Role', variant: 'primary' }, { label: 'Import Policy' }]}
                blocks={[
                  {
                    title: 'Role Definitions',
                    description: 'Keep role vocabulary centralized and auditable.',
                    points: [
                      'Platform Admin with global control over all modules.',
                      'Operator role for day-to-day agent and conversation operations.',
                      'Moderator role for policy and compliance workflows.',
                    ],
                  },
                  {
                    title: 'Lifecycle',
                    description: 'Roles move through draft, approved, and deprecated states.',
                    points: [
                      'Require approval before assigning a role to active users.',
                      'Track who changed role policy and when.',
                      'Run impact checks before role deprecation.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/users/permissions"
            element={
              <AdminModulePage
                title="Permissions"
                subtitle="Control endpoint and feature access at a granular level."
                actions={[{ label: 'Add Permission', variant: 'primary' }, { label: 'Export Matrix' }]}
                blocks={[
                  {
                    title: 'Permission Matrix',
                    description: 'Feature and API level ACL definitions.',
                    points: [
                      'Map read, write, publish, and manage scopes per module.',
                      'Segment permissions across agents, knowledge, and analytics.',
                      'Surface denied actions in audit logs for review.',
                    ],
                  },
                  {
                    title: 'Policy Rules',
                    description: 'Safety controls to prevent privilege escalation.',
                    points: [
                      'Enforce least-privilege defaults for all new users.',
                      'Require secondary approval for publish-level actions.',
                      'Version permission bundles for controlled rollout.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/knowledge/:knowledgeId" element={<KnowledgeDetailPage />} />
          <Route path="/knowledge/:knowledgeId/:tab" element={<KnowledgeDetailPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/:toolId" element={<ToolDetailPage />} />
          <Route path="/tools/:toolId/:tab" element={<ToolDetailPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/live" element={<ConversationsPage />} />
          <Route path="/conversations/history" element={<ConversationsPage />} />
          <Route path="/test" element={<TestCenterPage />} />
          <Route path="/test/runs/:runId" element={<TestRunDetailPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/settings/workspace"
            element={
              <AdminModulePage
                title="Workspace Settings"
                subtitle="Control org-level defaults, environments, and workflows."
                actions={[{ label: 'Save Workspace', variant: 'primary' }]}
                blocks={[
                  {
                    title: 'Workspace Profile',
                    description: 'Identity and defaults used across admin modules.',
                    points: [
                      'Workspace name, locale, and policy defaults.',
                      'Default model, voice, and moderation templates.',
                      'Environment-level feature toggles.',
                    ],
                  },
                  {
                    title: 'Operational Defaults',
                    description: 'Baseline behavior for newly created agents.',
                    points: [
                      'Conversation timeout and concurrency limits.',
                      'Auto-tagging and taxonomy settings.',
                      'Staging to production promotion rules.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/settings/billing"
            element={
              <AdminModulePage
                title="Billing"
                subtitle="Track usage costs and configure charge controls."
                actions={[{ label: 'Download Invoice' }, { label: 'Update Plan', variant: 'primary' }]}
                blocks={[
                  {
                    title: 'Usage Insights',
                    description: 'Cost views by provider, team, and environment.',
                    points: [
                      'LLM, voice, and telephony consumption breakdown.',
                      'Monthly quota burn and projected spend.',
                      'Alerting for threshold breaches.',
                    ],
                  },
                  {
                    title: 'Controls',
                    description: 'Prevent overspend with policy guardrails.',
                    points: [
                      'Set hard and soft monthly budget limits.',
                      'Define escalation workflow for limit override.',
                      'Sync billing metadata with finance systems.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/settings/security"
            element={
              <AdminModulePage
                title="Security"
                subtitle="Identity, secrets, and policy controls for platform safety."
                actions={[{ label: 'Rotate Secrets' }, { label: 'Run Security Audit', variant: 'primary' }]}
                blocks={[
                  {
                    title: 'Access Security',
                    description: 'Authentication and role protection strategy.',
                    points: [
                      'Session policy and token expiration controls.',
                      'MFA enforcement and admin login checks.',
                      'Role change audit trails.',
                    ],
                  },
                  {
                    title: 'Secret Management',
                    description: 'Secure key lifecycle across providers.',
                    points: [
                      'API key vault with masked inspection.',
                      'Scheduled secret rotation workflow.',
                      'Environment-level access policies.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/settings/system"
            element={
              <AdminModulePage
                title="System Settings"
                subtitle="Platform-level controls for reliability and observability."
                actions={[{ label: 'Apply Changes', variant: 'primary' }]}
                blocks={[
                  {
                    title: 'Runtime Controls',
                    description: 'Critical service knobs and failover behavior.',
                    points: [
                      'Queue retry policy and dead-letter handling.',
                      'Feature rollout gates by environment.',
                      'Health check and failover mode tuning.',
                    ],
                  },
                  {
                    title: 'Diagnostics',
                    description: 'Visibility and troubleshooting defaults.',
                    points: [
                      'Structured logs and retention windows.',
                      'Alert channel routing by severity.',
                      'SLO dashboards for API and conversation latency.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </AdminLayout>
              </TestRunsProvider>
            </AgentRegistryProvider>
          </ToolRegistryProvider>
        </KnowledgeRegistryProvider>
      </IntegrationRegistryProvider>
    </AdminRoute>
  );
}
