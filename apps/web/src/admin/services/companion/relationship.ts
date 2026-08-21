import type { Conversation } from '../../hooks/useConversationRegistry';
import type { Companion, CompanionRelationship } from './CompanionService';

export function demoRelationshipFor(input: {
  companion: Companion;
  viewerProfileId: string | null;
  conversations: Conversation[];
}): CompanionRelationship {
  const related = input.conversations.filter((conversation) => conversation.profileId === input.companion.profileId);
  const interactionCount = related.reduce((count, conversation) => count + conversation.messages.length, related.length);
  const lastInteractionAt = related
    .map((conversation) => conversation.lastActivityAt)
    .sort()
    .at(-1) ?? null;
  const relationshipLevel = Math.min(10, Math.max(1, Math.ceil(interactionCount / 4)));

  return {
    viewerProfileId: input.viewerProfileId,
    companionId: input.companion.id,
    relationshipLevel,
    trust: Math.min(100, 50 + interactionCount * 3),
    affection: Math.min(100, 45 + interactionCount * 2),
    familiarity: Math.min(100, 40 + interactionCount * 4),
    mood: input.companion.type === 'AI' ? 'attentive' : 'available',
    interactionCount,
    lastInteractionAt,
    source: 'DEMO',
  };
}