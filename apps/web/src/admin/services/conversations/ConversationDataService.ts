import type { Conversation } from '../../hooks/useConversationRegistry';
import type { InteractionMode } from '../social';

export type ConversationDataMode = InteractionMode;

export interface StartPersistedConversationInput {
  profileId: string;
  channel: Conversation['channel'];
  topic: string;
}

export interface ConversationDataService {
  readonly mode: ConversationDataMode;
  loadConversations(): Promise<Conversation[]>;
  startConversation(input: StartPersistedConversationInput): Promise<Conversation>;
  sendMessage(conversationId: string, text: string): Promise<Conversation>;
  markRead(conversationId: string): Promise<Conversation>;
  endConversation(conversationId: string): Promise<Conversation>;
  archiveConversation(conversationId: string): Promise<Conversation>;
}
