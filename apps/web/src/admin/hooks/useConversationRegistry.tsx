import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { subscribeToEvents } from '../../lib/api';
import { useAgentRegistry } from './useAgentRegistry';
import { useIntegrationRegistry } from './useIntegrationRegistry';
import { useKnowledgeRegistry } from './useKnowledgeRegistry';
import { useToolRegistry } from './useToolRegistry';
import { useSocialRegistry } from './useSocialRegistry';
import { demoCompanionService } from '../services/companion';
import { apiConversationDataService } from '../services/conversations';
import {
  simulatedSocialInteractionService,
  type CallAdvanceOptions,
  type CallStatus,
  type ConversationStatus,
  type EntityType,
  type InteractionChannel,
  type InteractionMode,
  type InteractionTraceStep,
} from '../services/social';

// Conversation Registry — every interaction that happens ON Aura, whether the
// other side is an AI character or a real person. One inbox, one shape, but the
// `entityType` discriminator is carried on every conversation, message, and
// call so AI is never rendered as a human.
//
// AI turns are traced through the agent dependency graph (agent -> knowledge ->
// tools -> integration). Real-person turns have no model, only transport.
// Demo state only — no backend persistence.

export type ConversationActivityType =
  | 'conversation_started'
  | 'message_sent'
  | 'ai_turn_failed'
  | 'conversation_ended'
  | 'conversation_archived'
  | 'call_started'
  | 'call_blocked'
  | 'call_status_changed'
  | 'call_ended'
  | 'call_failed';

export interface ConversationActivityEntry {
  id: string;
  type: ConversationActivityType;
  message: string;
  actor: string;
  timestamp: string;
}

export type MessageAuthor = 'operator' | 'participant' | 'system';

export interface ConversationMessage {
  id: string;
  author: MessageAuthor;
  authorName: string;
  /** null for system messages. AI replies always carry 'AI'. */
  entityType: EntityType | null;
  text: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'pending';
}

export interface CallEvent {
  id: string;
  status: CallStatus;
  note: string;
  timestamp: string;
}

export type CallKind = 'video' | 'voice';

export interface CallSession {
  id: string;
  conversationId: string;
  profileId: string;
  participantName: string;
  entityType: EntityType;
  kind: CallKind;
  status: CallStatus;
  startedAt: string;
  endedAt: string | null;
  events: CallEvent[];
  trace: InteractionTraceStep[];
}

export interface Conversation {
  id: string;
  profileId: string;
  participantName: string;
  participantHandle: string;
  entityType: EntityType;
  /** Set only for AI conversations. */
  agentId: string | null;
  channel: InteractionChannel;
  status: ConversationStatus;
  topic: string;
  startedAt: string;
  lastActivityAt: string;
  /** Messages from the counterpart since this viewer last read. Zero for demo threads. */
  unreadCount?: number;
  messages: ConversationMessage[];
  lastTrace: InteractionTraceStep[];
  lastTurnStatus: 'passed' | 'failed' | null;
  errors: string[];
  activity: ConversationActivityEntry[];
}

const ACTOR = 'Aman Ops';

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeActivity(type: ConversationActivityType, message: string): ConversationActivityEntry {
  return { id: uid('cact'), type, message, actor: ACTOR, timestamp: nowStamp() };
}

function seedMessage(
  id: string,
  author: MessageAuthor,
  authorName: string,
  entityType: EntityType | null,
  text: string,
  timestamp: string,
): ConversationMessage {
  return { id, author, authorName, entityType, text, timestamp, status: 'sent' };
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-maya-1',
    profileId: 'profile-ai-maya',
    participantName: 'Maya',
    participantHandle: '@maya.ai',
    entityType: 'AI',
    agentId: 'agent-maya',
    channel: 'chat',
    status: 'live',
    topic: 'Evening check-in',
    startedAt: '2026-08-19 19:02',
    lastActivityAt: '2026-08-19 19:14',
    messages: [
      seedMessage('msg-maya-1', 'operator', 'Aman Ops', null, 'Rough day today.', '2026-08-19 19:02'),
      seedMessage(
        'msg-maya-2',
        'participant',
        'Maya',
        'AI',
        'That sounds heavy. Want to talk through what happened?',
        '2026-08-19 19:03',
      ),
    ],
    lastTrace: [],
    lastTurnStatus: null,
    errors: [],
    activity: [makeActivity('conversation_started', 'Conversation started with AI character Maya.')],
  },
  {
    id: 'conv-companion-1',
    profileId: 'profile-ai-companion',
    participantName: 'Aura Companion',
    participantHandle: '@aura.companion',
    entityType: 'AI',
    agentId: 'agent-aura-companion',
    channel: 'voice',
    status: 'ended',
    topic: 'Morning journaling prompt',
    startedAt: '2026-08-18 08:10',
    lastActivityAt: '2026-08-18 08:24',
    messages: [
      seedMessage('msg-comp-1', 'operator', 'Aman Ops', null, 'Give me a journaling prompt.', '2026-08-18 08:10'),
      seedMessage(
        'msg-comp-2',
        'participant',
        'Aura Companion',
        'AI',
        'What is one thing you want to protect your energy from today?',
        '2026-08-18 08:11',
      ),
    ],
    lastTrace: [],
    lastTurnStatus: null,
    errors: [],
    activity: [makeActivity('conversation_started', 'Voice conversation started with AI character Aura Companion.')],
  },
  {
    id: 'conv-ananya-1',
    profileId: 'profile-person-ananya',
    participantName: 'Ananya Rao',
    participantHandle: '@ananya',
    entityType: 'REAL_PERSON',
    agentId: null,
    channel: 'chat',
    status: 'live',
    topic: 'Weekend photo walk',
    startedAt: '2026-08-19 12:40',
    lastActivityAt: '2026-08-19 12:52',
    messages: [
      seedMessage('msg-ana-1', 'operator', 'Aman Ops', null, 'Loved your last shot. Which lens?', '2026-08-19 12:40'),
      seedMessage(
        'msg-ana-2',
        'participant',
        'Ananya Rao',
        'REAL_PERSON',
        'Old 50mm. Thank you! Coming for the photo walk Sunday?',
        '2026-08-19 12:52',
      ),
    ],
    lastTrace: [],
    lastTurnStatus: null,
    errors: [],
    activity: [makeActivity('conversation_started', 'Conversation started with real person Ananya Rao.')],
  },
  {
    id: 'conv-rohan-1',
    profileId: 'profile-person-rohan',
    participantName: 'Rohan Mehta',
    participantHandle: '@rohan',
    entityType: 'REAL_PERSON',
    agentId: null,
    channel: 'video',
    status: 'ended',
    topic: 'Synth jam catch-up',
    startedAt: '2026-08-17 21:05',
    lastActivityAt: '2026-08-17 21:38',
    messages: [
      seedMessage('msg-roh-1', 'operator', 'Aman Ops', null, 'Free for a quick call?', '2026-08-17 21:05'),
      seedMessage('msg-roh-2', 'participant', 'Rohan Mehta', 'REAL_PERSON', 'Yes, calling now.', '2026-08-17 21:06'),
    ],
    lastTrace: [],
    lastTurnStatus: null,
    errors: [],
    activity: [makeActivity('conversation_started', 'Video conversation started with real person Rohan Mehta.')],
  },
];

export interface StartConversationInput {
  profileId: string;
  channel: InteractionChannel;
  topic: string;
}

interface ConversationRegistryContextValue {
  conversations: Conversation[];
  calls: CallSession[];
  mode: InteractionMode;
  getConversationById: (id: string) => Conversation | null;
  getCallById: (id: string) => CallSession | null;
  getCallsForConversation: (conversationId: string) => CallSession[];
  getConversationsForProfile: (profileId: string) => Conversation[];
  startConversation: (input: StartConversationInput) => Promise<Conversation | null>;
  sendMessage: (conversationId: string, text: string) => void;
  markRead: (conversationId: string) => void;
  endConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  /** Calls are a real-person capability. AI characters are blocked by design. */
  startCall: (conversationId: string, kind: CallKind) => CallSession | null;
  advanceCall: (callId: string, options?: CallAdvanceOptions) => void;
  endCall: (callId: string) => void;
}

const ConversationRegistryContext = createContext<ConversationRegistryContextValue | undefined>(undefined);

export function ConversationRegistryProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [mode, setMode] = useState<InteractionMode>('SIMULATED');

  const { status: authStatus } = useAuth();
  const { agents } = useAgentRegistry();
  const { integrations, agents: integrationBindings } = useIntegrationRegistry();
  const { knowledgeBases } = useKnowledgeRegistry();
  const { tools } = useToolRegistry();
  const { profiles, mode: socialMode, logProfileActivity } = useSocialRegistry();

  const service = simulatedSocialInteractionService;

  const context = useMemo(
    () => ({ agents, integrations, integrationBindings, knowledgeBases, tools }),
    [agents, integrations, integrationBindings, knowledgeBases, tools],
  );

  useEffect(() => {
    let active = true;
    if (authStatus !== 'authenticated' || socialMode !== 'REAL') {
      setMode('SIMULATED');
      setConversations(INITIAL_CONVERSATIONS);
      return () => {
        active = false;
      };
    }

    const load = (): void => {
      void apiConversationDataService
        .loadConversations()
        .then((persisted) => {
          if (!active) return;
          // In REAL mode every thread is persisted, including AI ones. Demo seeds are not
          // merged in: they would shadow real rows with ids the backend does not know.
          setConversations(persisted);
          setMode('REAL');
        })
        .catch(() => {
          if (!active) return;
          setMode('SIMULATED');
          setConversations(INITIAL_CONVERSATIONS);
        });
    };

    load();

    // Live inbox: the server only names the changed thread, so re-read to stay authoritative.
    const unsubscribe = subscribeToEvents('/api/v1/social/me/stream', (event) => {
      if (event === 'inbox' && active) load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authStatus, socialMode]);

  const replaceConversation = useCallback((conversation: Conversation): void => {
    setConversations((prev) => {
      const exists = prev.some((item) => item.id === conversation.id);
      return exists ? prev.map((item) => (item.id === conversation.id ? conversation : item)) : [conversation, ...prev];
    });
  }, []);

  const patchConversation = useCallback(
    (id: string, updater: (conversation: Conversation) => Conversation): void => {
      setConversations((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    },
    [],
  );

  const getConversationById = useCallback(
    (id: string): Conversation | null => conversations.find((item) => item.id === id) ?? null,
    [conversations],
  );

  const getCallById = useCallback((id: string): CallSession | null => calls.find((call) => call.id === id) ?? null, [calls]);

  const getCallsForConversation = useCallback(
    (conversationId: string): CallSession[] => calls.filter((call) => call.conversationId === conversationId),
    [calls],
  );

  const getConversationsForProfile = useCallback(
    (profileId: string): Conversation[] => conversations.filter((item) => item.profileId === profileId),
    [conversations],
  );

  const startConversation = useCallback(
    async (input: StartConversationInput): Promise<Conversation | null> => {
      const profile = profiles.find((item) => item.id === input.profileId);
      if (!profile) return null;
      const companion = demoCompanionService
        .resolveCompanions({ profiles, agents, integrations, currentProfileId: null, socialMode: 'DEMO' })
        .find((item) => item.profileId === profile.id) ?? null;
      if (!demoCompanionService.channelAvailable(companion, input.channel)) return null;

      if (socialMode === 'REAL') {
        const created = await apiConversationDataService.startConversation(input);
        replaceConversation(created);
        logProfileActivity(profile.id, 'conversation_started', `New ${input.channel} conversation started.`);
        return created;
      }

      const conversation: Conversation = {
        id: uid('conv'),
        profileId: profile.id,
        participantName: profile.displayName,
        participantHandle: profile.handle,
        entityType: profile.type,
        agentId: profile.agentId,
        channel: input.channel,
        status: 'live',
        topic: input.topic || 'New conversation',
        startedAt: nowStamp(),
        lastActivityAt: nowStamp(),
        messages: [],
        lastTrace: [],
        lastTurnStatus: null,
        errors: [],
        activity: [
          makeActivity(
            'conversation_started',
            `Conversation started with ${profile.type === 'AI' ? 'AI character' : 'real person'} ${profile.displayName}.`,
          ),
        ],
      };

      setConversations((prev) => [conversation, ...prev]);
      logProfileActivity(profile.id, 'conversation_started', `New ${input.channel} conversation started.`);
      return conversation;
    },
    [profiles, agents, integrations, socialMode, replaceConversation, logProfileActivity],
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string): void => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation || !text.trim()) return;
      // The backend owns the companion turn (character -> memory + relationship -> gateway),
      // so REAL mode never generates a reply on the client.
      if (socialMode === 'REAL') {
        const outgoing = seedMessage(uid('msg'), 'operator', ACTOR, null, text.trim(), nowStamp());
        const pending: ConversationMessage = {
          id: uid('msg-pending'),
          author: 'system',
          authorName: 'Aura',
          entityType: null,
          text: 'Thinking...',
          timestamp: nowStamp(),
          status: 'pending',
        };

        patchConversation(conversationId, (item) => ({
          ...item,
          status: item.status === 'archived' ? item.status : 'live',
          messages: [...item.messages, outgoing, pending],
          lastActivityAt: nowStamp(),
          lastTurnStatus: null,
          errors: [],
          activity: [makeActivity('message_sent', `Message sent to ${item.participantName}.`), ...item.activity],
        }));

        void apiConversationDataService
          .sendMessage(conversationId, text.trim())
          .then(replaceConversation)
          .catch(() => {
            patchConversation(conversationId, (item) => ({
              ...item,
              lastTurnStatus: 'failed',
              errors: ['Message could not be persisted.'],
              messages: item.messages.map((message) =>
                message.id === pending.id
                  ? { ...message, text: 'Message could not be delivered.', status: 'failed' }
                  : message,
              ),
              activity: [makeActivity('ai_turn_failed', 'Message could not be persisted.'), ...item.activity],
            }));
          });
        return;
      }

      demoCompanionService.setConversations(conversations);
      const companion = demoCompanionService
        .resolveCompanions({ profiles, agents, integrations, currentProfileId: null, socialMode: 'DEMO' })
        .find((item) => item.profileId === conversation.profileId) ?? null;
      const agent = companion?.agentId ? agents.find((item) => item.id === companion.agentId) ?? null : null;
      const relationship = companion
        ? demoCompanionService.resolveRelationship(companion, null, conversation.messages.length, conversation.lastActivityAt)
        : null;
      const turnContext = companion && relationship
        ? {
            companion,
            persona: demoCompanionService.resolvePersona(companion, agent),
            relationship,
            memories: demoCompanionService.resolveMemories(companion, null),
          }
        : null;

      const turn =
        demoCompanionService.can(companion, 'ai_reply')
          ? service.generateAiTurn(text, conversation.agentId, context, turnContext)
          : service.generatePersonTurn(text, conversation.participantName);

      const outgoing = seedMessage(uid('msg'), 'operator', ACTOR, null, text, nowStamp());
      const reply: ConversationMessage = {
        id: uid('msg'),
        author: turn.status === 'failed' ? 'system' : 'participant',
        authorName: turn.status === 'failed' ? 'Aura' : conversation.participantName,
        entityType: turn.status === 'failed' ? null : conversation.entityType,
        text: turn.status === 'failed' ? turn.errors[0] ?? turn.output : turn.output,
        timestamp: nowStamp(),
        status: turn.status === 'failed' ? 'failed' : 'sent',
      };

      patchConversation(conversationId, (item) => ({
        ...item,
        status: item.status === 'archived' ? item.status : 'live',
        messages: [...item.messages, outgoing, reply],
        lastActivityAt: nowStamp(),
        lastTrace: turn.trace,
        lastTurnStatus: turn.status,
        errors: turn.errors,
        activity: [
          ...(turn.status === 'failed'
            ? [makeActivity('ai_turn_failed', `Reply failed: ${turn.errors[0] ?? 'unknown error'}`)]
            : []),
          makeActivity('message_sent', `Message sent to ${item.participantName}.`),
          ...item.activity,
        ],
      }));
    },
    [conversations, profiles, agents, integrations, socialMode, context, service, replaceConversation, patchConversation],
  );

  const endConversation = useCallback(
    (conversationId: string): void => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (socialMode === 'REAL' && conversation) {
        void apiConversationDataService.endConversation(conversationId).then(replaceConversation);
        return;
      }
      patchConversation(conversationId, (item) => ({
        ...item,
        status: 'ended',
        lastActivityAt: nowStamp(),
        activity: [makeActivity('conversation_ended', 'Conversation ended.'), ...item.activity],
      }));
    },
    [conversations, socialMode, replaceConversation, patchConversation],
  );

  const markRead = useCallback(
    (conversationId: string): void => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (socialMode === 'REAL' && conversation) {
        void apiConversationDataService.markRead(conversationId).then(replaceConversation);
      }
    },
    [conversations, socialMode, replaceConversation],
  );

  const archiveConversation = useCallback(
    (conversationId: string): void => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (socialMode === 'REAL' && conversation) {
        void apiConversationDataService.archiveConversation(conversationId).then(replaceConversation);
        return;
      }
      patchConversation(conversationId, (item) => ({
        ...item,
        status: 'archived',
        lastActivityAt: nowStamp(),
        activity: [makeActivity('conversation_archived', 'Conversation archived.'), ...item.activity],
      }));
    },
    [conversations, socialMode, replaceConversation, patchConversation],
  );

  const startCall = useCallback(
    (conversationId: string, kind: CallKind): CallSession | null => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) return null;
      const companion = demoCompanionService
        .resolveCompanions({ profiles, agents, integrations, currentProfileId: null, socialMode: 'DEMO' })
        .find((item) => item.profileId === conversation.profileId) ?? null;

      if (!demoCompanionService.can(companion, kind)) {
        patchConversation(conversationId, (item) => ({
          ...item,
          activity: [
            makeActivity(
              'call_blocked',
              'Call blocked by companion capability resolution.',
            ),
            ...item.activity,
          ],
        }));
        return null;
      }

      const call: CallSession = {
        id: uid('call'),
        conversationId,
        profileId: conversation.profileId,
        participantName: conversation.participantName,
        entityType: conversation.entityType,
        kind,
        status: 'requested',
        startedAt: nowStamp(),
        endedAt: null,
        events: [{ id: uid('cev'), status: 'requested', note: `${kind} call requested.`, timestamp: nowStamp() }],
        trace: [],
      };

      setCalls((prev) => [call, ...prev]);
      patchConversation(conversationId, (item) => ({
        ...item,
        channel: kind,
        lastActivityAt: nowStamp(),
        activity: [makeActivity('call_started', `${kind} call requested with ${item.participantName}.`), ...item.activity],
      }));
      logProfileActivity(conversation.profileId, 'call_started', `${kind} call requested.`);
      return call;
    },
    [conversations, profiles, agents, integrations, patchConversation, logProfileActivity],
  );

  const applyCallTransition = useCallback(
    (call: CallSession, next: { status: CallStatus; note: string; trace: InteractionTraceStep[] }): void => {
      if (next.status === call.status) return;

      const terminal = next.status === 'ended' || next.status === 'failed' || next.status === 'declined';

      setCalls((prev) =>
        prev.map((item) =>
          item.id === call.id
            ? {
                ...item,
                status: next.status,
                endedAt: terminal ? nowStamp() : item.endedAt,
                events: [
                  ...item.events,
                  { id: uid('cev'), status: next.status, note: next.note, timestamp: nowStamp() },
                ],
                trace: [...item.trace, ...next.trace],
              }
            : item,
        ),
      );

      const activityType: ConversationActivityType =
        next.status === 'failed' ? 'call_failed' : next.status === 'ended' ? 'call_ended' : 'call_status_changed';

      patchConversation(call.conversationId, (item) => ({
        ...item,
        lastActivityAt: nowStamp(),
        activity: [makeActivity(activityType, `Call with ${call.participantName}: ${next.note}`), ...item.activity],
      }));

      if (next.status === 'ended' || next.status === 'failed') {
        logProfileActivity(call.profileId, 'call_ended', `Call ${next.status}. ${next.note}`);
      }
    },
    [patchConversation, logProfileActivity],
  );

  const advanceCall = useCallback(
    (callId: string, options?: CallAdvanceOptions): void => {
      const call = calls.find((item) => item.id === callId);
      if (!call) return;
      applyCallTransition(call, service.advanceCall(call.status, context, options));
    },
    [calls, service, context, applyCallTransition],
  );

  const endCall = useCallback(
    (callId: string): void => {
      const call = calls.find((item) => item.id === callId);
      if (!call) return;
      if (call.status === 'ended' || call.status === 'failed' || call.status === 'declined') return;
      applyCallTransition(call, { status: 'ended', note: 'Call ended by operator.', trace: [] });
    },
    [calls, applyCallTransition],
  );

  const value = useMemo<ConversationRegistryContextValue>(
    () => ({
      conversations,
      calls,
      mode,
      getConversationById,
      getCallById,
      getCallsForConversation,
      getConversationsForProfile,
      startConversation,
      sendMessage,
      markRead,
      endConversation,
      archiveConversation,
      startCall,
      advanceCall,
      endCall,
    }),
    [
      conversations,
      calls,
      mode,
      getConversationById,
      getCallById,
      getCallsForConversation,
      getConversationsForProfile,
      startConversation,
      sendMessage,
      markRead,
      endConversation,
      archiveConversation,
      startCall,
      advanceCall,
      endCall,
    ],
  );

  return <ConversationRegistryContext.Provider value={value}>{children}</ConversationRegistryContext.Provider>;
}

export function useConversationRegistry(): ConversationRegistryContextValue {
  const context = useContext(ConversationRegistryContext);
  if (!context) {
    throw new Error('useConversationRegistry must be used within a ConversationRegistryProvider');
  }
  return context;
}

export function useConversationRegistryOptional(): ConversationRegistryContextValue | null {
  return useContext(ConversationRegistryContext) ?? null;
}
