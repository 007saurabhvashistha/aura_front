import type { Conversation } from '../../hooks/useConversationRegistry';
import type { Companion, CompanionMemoryItem } from './CompanionService';

export function demoMemoriesFor(input: {
  companion: Companion;
  viewerProfileId: string | null;
  conversations: Conversation[];
}): CompanionMemoryItem[] {
  if (input.companion.type !== 'AI') return [];
  return input.conversations
    .filter((conversation) => conversation.profileId === input.companion.profileId)
    .flatMap((conversation) => conversation.messages.filter((message) => message.author === 'operator').slice(-2).map((message) => ({
      id: `memory-${message.id}`,
      companionId: input.companion.id,
      viewerProfileId: input.viewerProfileId,
      layer: 'short_term' as const,
      text: message.text,
      importance: 3,
      status: 'active' as const,
      createdAt: message.timestamp,
      updatedAt: message.timestamp,
      sourceConversationId: conversation.id,
      source: 'DEMO' as const,
    })));
}