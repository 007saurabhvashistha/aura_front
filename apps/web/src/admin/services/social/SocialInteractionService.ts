import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { AgentBinding, IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { KnowledgeBase } from '../../hooks/useKnowledgeRegistry';
import type { Tool } from '../../hooks/useToolRegistry';
import type { CompanionTurnContext } from '../companion';

// Frontend contract for every social/live interaction in Aura.
//
// PRODUCT PRINCIPLE: Aura hosts two distinct kinds of participants — AI
// characters and real people. They share one discovery and inbox experience,
// but the system must ALWAYS keep them technically and visually distinct.
// `EntityType` is the single discriminator every surface reads; AI is never
// rendered without an AI label.
//
// The UI depends only on this contract, so the simulated adapter can be
// replaced by a real (LiveKit / messaging backend) adapter with no UI rewrite.

export type EntityType = 'AI' | 'REAL_PERSON';

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  AI: 'AI Character',
  REAL_PERSON: 'Real Person',
};

export const ENTITY_TYPE_SHORT_LABELS: Record<EntityType, string> = {
  AI: 'AI',
  REAL_PERSON: 'REAL',
};

export type InteractionChannel = 'chat' | 'voice' | 'video';

export const CHANNEL_LABELS: Record<InteractionChannel, string> = {
  chat: 'Chat',
  voice: 'Voice',
  video: 'Video',
};

export type ConversationStatus = 'live' | 'ended' | 'archived';

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  live: 'Live',
  ended: 'Ended',
  archived: 'Archived',
};

// Call lifecycle is a strict state machine. Real calls only exist between real
// people; AI characters use the agent voice pipeline instead.
export type CallStatus = 'requested' | 'ringing' | 'connecting' | 'active' | 'ended' | 'declined' | 'failed';

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  requested: 'Requested',
  ringing: 'Ringing',
  connecting: 'Connecting',
  active: 'Active',
  ended: 'Ended',
  declined: 'Declined',
  failed: 'Failed',
};

export type InteractionMode = 'SIMULATED' | 'REAL';

export type InteractionStepStatus = 'passed' | 'failed' | 'skipped';

export type InteractionStage =
  | 'input'
  | 'agent'
  | 'knowledge'
  | 'tool'
  | 'integration'
  | 'transport'
  | 'output';

export type InteractionResourceType = 'agent' | 'knowledge' | 'tool' | 'integration' | 'profile';

export interface InteractionTraceStep {
  id: string;
  stage: InteractionStage;
  label: string;
  detail: string;
  status: InteractionStepStatus;
  latencyMs: number;
  resourceType?: InteractionResourceType;
  resourceId?: string;
  href?: string;
  error?: string;
}

export interface AiTurnResult {
  status: 'passed' | 'failed';
  output: string;
  totalLatencyMs: number;
  errors: string[];
  trace: InteractionTraceStep[];
}

export interface CallAdvanceResult {
  status: CallStatus;
  note: string;
  trace: InteractionTraceStep[];
}

export interface CallAdvanceOptions {
  /**
   * Consumer-app demo fallback: connect the call over a simulated transport when
   * the realtime provider is unavailable, instead of failing it. The step is
   * still traced and labelled DEMO so operators can tell it apart.
   */
  forceDemoTransport?: boolean;
}

// Registry snapshot the adapter reads from. Passing it in keeps the adapter
// pure and makes the future API adapter a drop-in replacement.
export interface SocialInteractionContext {
  agents: ControlPlaneAgent[];
  integrations: IntegrationRecord[];
  integrationBindings: AgentBinding[];
  knowledgeBases: KnowledgeBase[];
  tools: Tool[];
}

export interface SocialInteractionService {
  mode: InteractionMode;
  // AI reply for an AI-character conversation, traced through the same agent
  // dependency graph the Test Center uses.
  generateAiTurn: (
    input: string,
    agentId: string | null,
    context: SocialInteractionContext,
    turnContext?: CompanionTurnContext | null,
  ) => AiTurnResult;
  // Real-person reply. No agent, no model — only transport.
  generatePersonTurn: (input: string, participantName: string) => AiTurnResult;
  // Next state of a real-person call, derived from realtime integration health.
  advanceCall: (
    current: CallStatus,
    context: SocialInteractionContext,
    options?: CallAdvanceOptions,
  ) => CallAdvanceResult;
}
