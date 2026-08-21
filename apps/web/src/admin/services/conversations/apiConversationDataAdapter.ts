import { apiRequest } from '../../../lib/api';
import type { Conversation, ConversationMessage } from '../../hooks/useConversationRegistry';
import type { ConversationDataService, StartPersistedConversationInput } from './ConversationDataService';

const BASE = '/api/v1/social/conversations';

interface ApiConversationMessage {
  id: string;
  author: ConversationMessage['author'];
  authorName: string;
  entityType: ConversationMessage['entityType'];
  text: string;
  timestamp: string;
  status: ConversationMessage['status'];
}

interface ApiConversation {
  id: string;
  profileId: string;
  participantName: string;
  participantHandle: string;
  entityType: Conversation['entityType'];
  agentId: string | null;
  channel: Conversation['channel'];
  status: Conversation['status'];
  topic: string;
  startedAt: string;
  lastActivityAt: string;
  unreadCount: number;
  messages: ApiConversationMessage[];
  lastTrace: Conversation['lastTrace'];
  lastTurnStatus: Conversation['lastTurnStatus'];
  errors: string[];
}

function toConversation(conversation: ApiConversation): Conversation {
  const messageActivity = conversation.messages.map((message) => ({
    id: `activity-${conversation.id}-${message.id}`,
    type: 'message_sent' as const,
    message: `${message.author === 'operator' ? 'Message sent' : 'Message received'} in persisted conversation.`,
    actor: message.author === 'operator' ? 'You' : message.authorName,
    timestamp: message.timestamp,
  }));

  return {
    ...conversation,
    unreadCount: conversation.unreadCount ?? 0,
    messages: conversation.messages.map((message) => ({ ...message })),
    activity: [
      ...messageActivity,
      {
        id: `activity-${conversation.id}-loaded`,
        type: 'conversation_started',
        message: 'Persisted conversation loaded from Aura API.',
        actor: 'Aura API',
        timestamp: conversation.lastActivityAt,
      },
    ],
  };
}

export class ApiConversationDataAdapter implements ConversationDataService {
  readonly mode = 'REAL' as const;

  async loadConversations(): Promise<Conversation[]> {
    const conversations = await apiRequest<ApiConversation[]>(BASE);
    return conversations.map(toConversation);
  }

  async startConversation(input: StartPersistedConversationInput): Promise<Conversation> {
    const conversation = await apiRequest<ApiConversation>(BASE, { method: 'POST', body: input });
    return toConversation(conversation);
  }

  async sendMessage(conversationId: string, text: string): Promise<Conversation> {
    const conversation = await apiRequest<ApiConversation>(`${BASE}/${conversationId}/messages`, {
      method: 'POST',
      body: { text },
    });
    return toConversation(conversation);
  }

  async markRead(conversationId: string): Promise<Conversation> {
    const conversation = await apiRequest<ApiConversation>(`${BASE}/${conversationId}/read`, { method: 'POST' });
    return toConversation(conversation);
  }

  async endConversation(conversationId: string): Promise<Conversation> {
    const conversation = await apiRequest<ApiConversation>(`${BASE}/${conversationId}/end`, { method: 'POST' });
    return toConversation(conversation);
  }

  async archiveConversation(conversationId: string): Promise<Conversation> {
    const conversation = await apiRequest<ApiConversation>(`${BASE}/${conversationId}/archive`, { method: 'POST' });
    return toConversation(conversation);
  }
}

export const apiConversationDataService: ConversationDataService = new ApiConversationDataAdapter();
