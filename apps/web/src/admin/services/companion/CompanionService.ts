import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { SocialProfile } from '../../hooks/useSocialRegistry';
import type { EntityType, InteractionChannel } from '../social';

export type CompanionType = EntityType;
export type CompanionSource = 'DEMO' | 'REAL' | 'BACKEND_REQUIRED';
export type CompanionStatus = 'active' | 'inactive' | 'unavailable' | 'archived';

export type CompanionCapabilityKey =
  | 'message'
  | 'voice'
  | 'video'
  | 'stories'
  | 'posts'
  | 'follow'
  | 'ai_reply'
  | 'memory'
  | 'relationship';

export interface ResolvedCapability {
  key: CompanionCapabilityKey;
  available: boolean;
  mode: CompanionSource;
  reason: string;
}

export interface CompanionAvailability {
  presence: SocialProfile['presence'];
  canStartConversation: boolean;
  canStartRealtime: boolean;
  reason: string;
}

export interface Companion {
  id: string;
  type: CompanionType;
  profileId: string;
  agentId: string | null;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  status: CompanionStatus;
  availability: CompanionAvailability;
  capabilities: ResolvedCapability[];
  source: CompanionSource;
}

export interface CompanionPersona {
  companionId: string;
  agentId: string;
  personality: string[];
  backstory: string;
  speakingStyle: {
    languageMode: string;
    tone: string;
    replyLength: 'short' | 'medium' | 'long';
    examples: string[];
  };
  traits: string[];
  preferences: string[];
  boundaries: string[];
  relationshipStyle: string;
  source: CompanionSource;
}

export interface CompanionRelationship {
  viewerProfileId: string | null;
  companionId: string;
  relationshipLevel: number;
  trust: number;
  affection: number;
  familiarity: number;
  mood: string;
  interactionCount: number;
  lastInteractionAt: string | null;
  source: CompanionSource;
}

export type CompanionMemoryLayer = 'short_term' | 'episodic' | 'relationship' | 'important' | 'long_term';

export interface CompanionMemoryItem {
  id: string;
  companionId: string;
  viewerProfileId: string | null;
  layer: CompanionMemoryLayer;
  text: string;
  importance: number;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
  sourceConversationId?: string;
  source: CompanionSource;
}

export interface CompanionResolutionContext {
  profiles: SocialProfile[];
  agents: ControlPlaneAgent[];
  integrations: IntegrationRecord[];
  currentProfileId: string | null;
  socialMode: 'DEMO' | 'REAL';
}

export interface CompanionTurnContext {
  companion: Companion;
  persona: CompanionPersona | null;
  relationship: CompanionRelationship;
  memories: CompanionMemoryItem[];
}

export interface CompanionService {
  resolveCompanions(context: CompanionResolutionContext): Companion[];
  resolvePersona(companion: Companion, agent: ControlPlaneAgent | null): CompanionPersona | null;
  resolveRelationship(companion: Companion, viewerProfileId: string | null, interactionCount: number, lastInteractionAt: string | null): CompanionRelationship;
  resolveMemories(companion: Companion, viewerProfileId: string | null): CompanionMemoryItem[];
  can(companion: Companion | null, capability: CompanionCapabilityKey): boolean;
  channelAvailable(companion: Companion | null, channel: InteractionChannel): boolean;
}