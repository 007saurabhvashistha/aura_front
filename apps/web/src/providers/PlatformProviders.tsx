import type { ReactNode } from 'react';
import { IntegrationRegistryProvider } from '../admin/hooks/useIntegrationRegistry';
import { KnowledgeRegistryProvider } from '../admin/hooks/useKnowledgeRegistry';
import { ToolRegistryProvider } from '../admin/hooks/useToolRegistry';
import { AgentRegistryProvider } from '../admin/hooks/useAgentRegistry';
import { TestRunsProvider } from '../admin/hooks/useTestRuns';
import { SocialRegistryProvider } from '../admin/hooks/useSocialRegistry';
import { ConversationRegistryProvider } from '../admin/hooks/useConversationRegistry';
import { CompanionRegistryProvider } from '../admin/hooks/useCompanionRegistry';
import { NotificationsProvider } from '../app/data/useNotifications';

// One platform state tree for BOTH surfaces:
//   /admin -> control plane (build, configure, validate, observe)
//   /app   -> the Aura consumer experience (discover, profile, chat, call)
// Hoisting the registries above both means an action taken in the consumer app
// (message, story, post, call) is immediately visible in Admin Activity.
// All registries are in-memory demo state, so mounting them costs nothing.
export function PlatformProviders({ children }: { children: ReactNode }) {
  return (
    <IntegrationRegistryProvider>
      <KnowledgeRegistryProvider>
        <ToolRegistryProvider>
          <AgentRegistryProvider>
            <TestRunsProvider>
              <SocialRegistryProvider>
                <ConversationRegistryProvider>
                  <CompanionRegistryProvider>
                    <NotificationsProvider>{children}</NotificationsProvider>
                  </CompanionRegistryProvider>
                </ConversationRegistryProvider>
              </SocialRegistryProvider>
            </TestRunsProvider>
          </AgentRegistryProvider>
        </ToolRegistryProvider>
      </KnowledgeRegistryProvider>
    </IntegrationRegistryProvider>
  );
}
