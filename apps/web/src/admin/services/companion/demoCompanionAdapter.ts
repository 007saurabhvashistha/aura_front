import type { Conversation } from '../../hooks/useConversationRegistry';
import type { InteractionChannel } from '../social';
import { hasCapability, resolveCapabilities } from './capabilities';
import type {
  Companion,
  CompanionCapabilityKey,
  CompanionResolutionContext,
  CompanionService,
} from './CompanionService';
import { demoMemoriesFor } from './memory';
import { demoPersonaFor } from './persona';
import { demoRelationshipFor } from './relationship';

function statusFor(profileType: Companion['type'], agentStatus?: string): Companion['status'] {
  if (profileType === 'REAL_PERSON') return 'active';
  if (agentStatus === 'archived') return 'archived';
  if (agentStatus === 'disabled') return 'inactive';
  return agentStatus ? 'active' : 'unavailable';
}

export class DemoCompanionAdapter implements CompanionService {
  private conversations: Conversation[] = [];

  setConversations(conversations: Conversation[]): void {
    this.conversations = conversations;
  }

  resolveCompanions(context: CompanionResolutionContext): Companion[] {
    return context.profiles.map((profile) => {
      const agent = profile.agentId ? context.agents.find((item) => item.id === profile.agentId) : null;
      const source = context.socialMode === 'REAL' && profile.type === 'REAL_PERSON' ? 'REAL' : 'DEMO';
      const capabilities = resolveCapabilities({
        profile,
        integrations: context.integrations,
        source,
        isSelf: profile.id === context.currentProfileId,
      });
      const canStartRealtime = hasCapability(capabilities, 'video') || hasCapability(capabilities, 'voice');

      return {
        id: `companion-${profile.id}`,
        type: profile.type,
        profileId: profile.id,
        agentId: profile.agentId,
        displayName: profile.displayName,
        handle: profile.handle,
        avatarUrl: null,
        status: statusFor(profile.type, agent?.status),
        availability: {
          presence: profile.presence,
          canStartConversation: hasCapability(capabilities, 'message'),
          canStartRealtime,
          reason: profile.presence === 'offline' ? 'Profile is offline; async messaging remains available.' : 'Companion is available.',
        },
        capabilities,
        source,
      };
    });
  }

  resolvePersona(companion: Companion, agent: Parameters<CompanionService['resolvePersona']>[1]) {
    return demoPersonaFor(companion, agent);
  }

  resolveRelationship(companion: Companion, viewerProfileId: string | null, interactionCount: number, lastInteractionAt: string | null) {
    const relationship = demoRelationshipFor({ companion, viewerProfileId, conversations: this.conversations });
    return { ...relationship, interactionCount, lastInteractionAt };
  }

  resolveMemories(companion: Companion, viewerProfileId: string | null) {
    return demoMemoriesFor({ companion, viewerProfileId, conversations: this.conversations });
  }

  can(companion: Companion | null, capability: CompanionCapabilityKey): boolean {
    return Boolean(companion && hasCapability(companion.capabilities, capability));
  }

  channelAvailable(companion: Companion | null, channel: InteractionChannel): boolean {
    if (channel === 'chat') return this.can(companion, 'message');
    if (channel === 'video') return this.can(companion, 'video');
    return this.can(companion, 'voice');
  }
}

export const demoCompanionService = new DemoCompanionAdapter();