import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAgentRegistry } from './useAgentRegistry';
import { useConversationRegistryOptional } from './useConversationRegistry';
import { useIntegrationRegistry } from './useIntegrationRegistry';
import { useSocialRegistry } from './useSocialRegistry';
import {
  apiCompanionDataService,
  demoCompanionService,
  type Companion,
  type CompanionCapabilityKey,
  type CompanionEngineStatus,
  type CompanionMemoryItem,
  type CompanionPersona,
  type CompanionRelationship,
  type CompanionState,
  type CompanionTurnContext,
} from '../services/companion';
import type { InteractionChannel } from '../services/social';

interface CompanionRegistryContextValue {
  companions: Companion[];
  /** Null until the persisted engine reports in; DEMO surfaces stay on derived state. */
  engine: CompanionEngineStatus | null;
  getCompanionById: (id: string) => Companion | null;
  getCompanionByProfileId: (profileId: string) => Companion | null;
  getPersona: (companionId: string) => CompanionPersona | null;
  getRelationship: (companionId: string) => CompanionRelationship | null;
  getMemories: (companionId: string) => CompanionMemoryItem[];
  getTurnContextByProfileId: (profileId: string) => CompanionTurnContext | null;
  can: (companionOrProfileId: Companion | string | null, capability: CompanionCapabilityKey) => boolean;
  channelAvailable: (companionOrProfileId: Companion | string | null, channel: InteractionChannel) => boolean;
}

const CompanionRegistryContext = createContext<CompanionRegistryContextValue | undefined>(undefined);

export function CompanionRegistryProvider({ children }: { children: ReactNode }) {
  const { profiles, currentProfileId, mode: socialMode } = useSocialRegistry();
  const { agents } = useAgentRegistry();
  const { integrations } = useIntegrationRegistry();
  const conversationRegistry = useConversationRegistryOptional();
  const conversations = conversationRegistry?.conversations ?? [];

  demoCompanionService.setConversations(conversations);

  const companions = useMemo(
    () => demoCompanionService.resolveCompanions({ profiles, agents, integrations, currentProfileId, socialMode }),
    [profiles, agents, integrations, currentProfileId, socialMode],
  );

  const [engine, setEngine] = useState<CompanionEngineStatus | null>(null);
  const [persisted, setPersisted] = useState<Record<string, CompanionState>>({});
  const aiCompanionKeys = useMemo(
    () =>
      companions
        .filter((companion) => companion.type === 'AI')
        .map((companion) => `${companion.id}:${companion.profileId}`)
        .join(','),
    [companions],
  );

  // Persisted state is an enhancement, not a requirement: any failure leaves the
  // derived demo values in place instead of emptying the surface.
  useEffect(() => {
    if (socialMode !== 'REAL' || !aiCompanionKeys) {
      setEngine(null);
      setPersisted({});
      return;
    }
    let active = true;

    void apiCompanionDataService
      .engineStatus()
      .then((status) => {
        if (active) setEngine(status);
      })
      .catch(() => undefined);

    void Promise.all(
      aiCompanionKeys.split(',').map(async (key) => {
        const [companionId, profileId] = key.split(':');
        try {
          return [companionId, await apiCompanionDataService.loadState(companionId, profileId)] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setPersisted(Object.fromEntries(entries.filter((entry): entry is [string, CompanionState] => entry !== null)));
    });

    return () => {
      active = false;
    };
  }, [socialMode, aiCompanionKeys]);

  const getCompanionById = useCallback(
    (id: string): Companion | null => companions.find((companion) => companion.id === id) ?? null,
    [companions],
  );

  const getCompanionByProfileId = useCallback(
    (profileId: string): Companion | null => companions.find((companion) => companion.profileId === profileId) ?? null,
    [companions],
  );

  const getPersona = useCallback(
    (companionId: string): CompanionPersona | null => {
      const stored = persisted[companionId]?.persona;
      if (stored) return stored;
      const companion = getCompanionById(companionId);
      const agent = companion?.agentId ? agents.find((item) => item.id === companion.agentId) ?? null : null;
      return companion ? demoCompanionService.resolvePersona(companion, agent) : null;
    },
    [agents, getCompanionById, persisted],
  );

  const getRelationship = useCallback(
    (companionId: string): CompanionRelationship | null => {
      const stored = persisted[companionId]?.relationship;
      if (stored) return stored;
      const companion = getCompanionById(companionId);
      if (!companion) return null;
      const related = conversations.filter((conversation) => conversation.profileId === companion.profileId);
      const interactionCount = related.reduce((count, conversation) => count + conversation.messages.length, related.length);
      const lastInteractionAt = related.map((conversation) => conversation.lastActivityAt).sort().at(-1) ?? null;
      return demoCompanionService.resolveRelationship(companion, currentProfileId, interactionCount, lastInteractionAt);
    },
    [conversations, currentProfileId, getCompanionById, persisted],
  );

  const getMemories = useCallback(
    (companionId: string): CompanionMemoryItem[] => {
      const stored = persisted[companionId]?.memories;
      if (stored) return stored;
      const companion = getCompanionById(companionId);
      return companion ? demoCompanionService.resolveMemories(companion, currentProfileId) : [];
    },
    [currentProfileId, getCompanionById, persisted],
  );

  const getTurnContextByProfileId = useCallback(
    (profileId: string): CompanionTurnContext | null => {
      const companion = getCompanionByProfileId(profileId);
      if (!companion) return null;
      const relationship = getRelationship(companion.id);
      if (!relationship) return null;
      return {
        companion,
        persona: getPersona(companion.id),
        relationship,
        memories: getMemories(companion.id),
      };
    },
    [getCompanionByProfileId, getMemories, getPersona, getRelationship],
  );

  const resolveInput = useCallback(
    (companionOrProfileId: Companion | string | null): Companion | null => {
      if (!companionOrProfileId) return null;
      return typeof companionOrProfileId === 'string' ? getCompanionByProfileId(companionOrProfileId) : companionOrProfileId;
    },
    [getCompanionByProfileId],
  );

  const can = useCallback(
    (companionOrProfileId: Companion | string | null, capability: CompanionCapabilityKey): boolean =>
      demoCompanionService.can(resolveInput(companionOrProfileId), capability),
    [resolveInput],
  );

  const channelAvailable = useCallback(
    (companionOrProfileId: Companion | string | null, channel: InteractionChannel): boolean =>
      demoCompanionService.channelAvailable(resolveInput(companionOrProfileId), channel),
    [resolveInput],
  );

  const value = useMemo<CompanionRegistryContextValue>(
    () => ({
      companions,
      engine,
      getCompanionById,
      getCompanionByProfileId,
      getPersona,
      getRelationship,
      getMemories,
      getTurnContextByProfileId,
      can,
      channelAvailable,
    }),
    [companions, engine, getCompanionById, getCompanionByProfileId, getPersona, getRelationship, getMemories, getTurnContextByProfileId, can, channelAvailable],
  );

  return <CompanionRegistryContext.Provider value={value}>{children}</CompanionRegistryContext.Provider>;
}

export function useCompanionRegistry(): CompanionRegistryContextValue {
  const context = useContext(CompanionRegistryContext);
  if (!context) {
    throw new Error('useCompanionRegistry must be used within a CompanionRegistryProvider');
  }
  return context;
}

export function useCompanionRegistryOptional(): CompanionRegistryContextValue | null {
  return useContext(CompanionRegistryContext) ?? null;
}