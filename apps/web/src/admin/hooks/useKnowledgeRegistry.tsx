import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Knowledge Control Center state. KnowledgeRegistry is the single frontend source
// of truth for knowledge resources, keyed by stable IDs and bound to agents via
// assignedAgentIds. Ingestion, indexing, and retrieval are simulated demo state;
// nothing here is real and nothing survives a full reload.

export type KnowledgeSourceType = 'document' | 'url' | 'text' | 'faq';

export type SourceStatus = 'pending' | 'processing' | 'indexed' | 'failed' | 'disabled';

// Knowledge-base index lifecycle. Kept as a small enum for backward compatibility;
// prefer getKnowledgeReadiness() for surface decisions.
export type ProcessingStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export type KnowledgeReadiness = 'READY' | 'INDEXING' | 'EMPTY' | 'FAILED' | 'DISABLED';

export type KnowledgeActivityType =
  | 'created'
  | 'updated'
  | 'duplicated'
  | 'source_added'
  | 'source_removed'
  | 'source_processing'
  | 'index_completed'
  | 'index_failed'
  | 'agent_assigned'
  | 'agent_removed'
  | 'disabled'
  | 'enabled';

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  status: SourceStatus;
  sizeLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeActivityEntry {
  id: string;
  type: KnowledgeActivityType;
  message: string;
  actor: string;
  timestamp: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  disabled: boolean;
  indexStatus: ProcessingStatus;
  lastIndexedAt: string | null;
  sources: KnowledgeSource[];
  assignedAgentIds: string[];
  metadata: { visibility: 'workspace' | 'private' };
  createdAt: string;
  updatedAt: string;
  activity: KnowledgeActivityEntry[];
}

// Centralized readiness logic — the single rule used by Knowledge Detail, Agent
// Detail, and Agent Builder so publish-eligibility never drifts.
export function getKnowledgeReadiness(kb: KnowledgeBase): KnowledgeReadiness {
  if (kb.disabled) return 'DISABLED';
  const active = kb.sources.filter((source) => source.status !== 'disabled');
  if (active.length === 0) return 'EMPTY';
  if (kb.indexStatus === 'processing' || active.some((source) => source.status === 'processing' || source.status === 'pending')) {
    return 'INDEXING';
  }
  const indexed = active.filter((source) => source.status === 'indexed');
  if (indexed.length === 0 || kb.indexStatus === 'failed') return 'FAILED';
  return 'READY';
}

export function knowledgeReadinessReason(readiness: KnowledgeReadiness): string {
  switch (readiness) {
    case 'READY':
      return 'Knowledge base is indexed and ready for agents.';
    case 'INDEXING':
      return 'Knowledge base is still indexing.';
    case 'EMPTY':
      return 'Knowledge base contains no indexed sources.';
    case 'FAILED':
      return 'Knowledge base indexing failed. Retry the sources.';
    case 'DISABLED':
      return 'Knowledge base is disabled.';
    default:
      return '';
  }
}

interface KnowledgeRegistryContextValue {
  knowledgeBases: KnowledgeBase[];
  getKnowledgeBaseById: (id: string) => KnowledgeBase | null;
  createKnowledgeBase: (input: { name: string; description: string }) => KnowledgeBase;
  updateKnowledgeBase: (id: string, input: { name: string; description: string }) => void;
  deleteKnowledgeBase: (id: string) => void;
  duplicateKnowledgeBase: (id: string) => KnowledgeBase | null;
  disableKnowledgeBase: (id: string) => void;
  enableKnowledgeBase: (id: string) => void;
  reindexKnowledgeBase: (id: string) => void;
  startIndexing: (id: string) => void;
  addSource: (id: string, input: { type: KnowledgeSourceType; title: string }) => void;
  updateSource: (id: string, sourceId: string, input: { title: string }) => void;
  removeSource: (id: string, sourceId: string) => void;
  retrySource: (id: string, sourceId: string) => void;
  disableSource: (id: string, sourceId: string) => void;
  enableSource: (id: string, sourceId: string) => void;
  reindexSource: (id: string, sourceId: string) => void;
  assignAgent: (knowledgeBaseId: string, agentId: string) => void;
  removeAgent: (knowledgeBaseId: string, agentId: string) => void;
  logActivity: (id: string, type: KnowledgeActivityType, message: string) => void;
}

const KnowledgeRegistryContext = createContext<KnowledgeRegistryContextValue | undefined>(undefined);

const ACTOR = 'Aman Ops';

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function makeActivity(kbId: string, type: KnowledgeActivityType, message: string): KnowledgeActivityEntry {
  return { id: `${kbId}-act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, type, message, actor: ACTOR, timestamp: nowStamp() };
}

const SOURCE_TYPE_DEFAULT_SIZE: Record<KnowledgeSourceType, string | null> = {
  document: '1.2 MB',
  url: null,
  text: '3 KB',
  faq: null,
};

const INITIAL_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb-product-docs',
    name: 'Product Documentation',
    description: 'Core product guides, feature references, and setup walkthroughs.',
    disabled: false,
    indexStatus: 'indexed',
    lastIndexedAt: '2026-08-10 18:20',
    assignedAgentIds: ['agent-support', 'agent-maya'],
    metadata: { visibility: 'workspace' },
    createdAt: '2026-08-09 09:00',
    updatedAt: '2026-08-10 18:20',
    sources: [
      { id: 'src-doc-1', type: 'document', title: 'getting-started.pdf', status: 'indexed', sizeLabel: '2.1 MB', createdAt: '2026-08-09 10:12', updatedAt: '2026-08-10 18:20' },
      { id: 'src-url-1', type: 'url', title: 'https://docs.aura.ai/guides', status: 'indexed', sizeLabel: null, createdAt: '2026-08-09 10:20', updatedAt: '2026-08-10 18:20' },
      { id: 'src-faq-1', type: 'faq', title: 'Billing FAQ (12 entries)', status: 'indexed', sizeLabel: null, createdAt: '2026-08-09 11:02', updatedAt: '2026-08-10 18:20' },
    ],
    activity: [
      { id: 'kb-product-docs-act-2', type: 'index_completed', message: 'Indexing completed for 3 sources.', actor: ACTOR, timestamp: '2026-08-10 18:20' },
      { id: 'kb-product-docs-act-1', type: 'created', message: 'Knowledge base created.', actor: ACTOR, timestamp: '2026-08-09 09:00' },
    ],
  },
  {
    id: 'kb-support-playbook',
    name: 'Support Playbook',
    description: 'Escalation policies, troubleshooting trees, and response templates.',
    disabled: false,
    indexStatus: 'processing',
    lastIndexedAt: '2026-08-10 16:44',
    assignedAgentIds: ['agent-support'],
    metadata: { visibility: 'workspace' },
    createdAt: '2026-08-10 16:00',
    updatedAt: '2026-08-11 08:05',
    sources: [
      { id: 'src-doc-2', type: 'document', title: 'escalation-matrix.docx', status: 'processing', sizeLabel: '640 KB', createdAt: '2026-08-11 08:01', updatedAt: '2026-08-11 08:05' },
      { id: 'src-faq-2', type: 'faq', title: 'Common Issues (24 entries)', status: 'indexed', sizeLabel: null, createdAt: '2026-08-10 16:44', updatedAt: '2026-08-10 16:44' },
    ],
    activity: [
      { id: 'kb-support-playbook-act-1', type: 'source_processing', message: 'Source "escalation-matrix.docx" processing.', actor: ACTOR, timestamp: '2026-08-11 08:05' },
    ],
  },
  {
    id: 'kb-company-policies',
    name: 'Company Policies',
    description: 'Internal policies referenced for compliance-sensitive responses.',
    disabled: false,
    indexStatus: 'pending',
    lastIndexedAt: null,
    assignedAgentIds: [],
    metadata: { visibility: 'private' },
    createdAt: '2026-08-11 07:30',
    updatedAt: '2026-08-11 07:30',
    sources: [],
    activity: [{ id: 'kb-company-policies-act-1', type: 'created', message: 'Knowledge base created.', actor: ACTOR, timestamp: '2026-08-11 07:30' }],
  },
];

export function KnowledgeRegistryProvider({ children }: { children: ReactNode }) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(INITIAL_KNOWLEDGE_BASES);

  const getKnowledgeBaseById = useCallback(
    (id: string): KnowledgeBase | null => knowledgeBases.find((kb) => kb.id === id) ?? null,
    [knowledgeBases],
  );

  const mutate = useCallback((id: string, updater: (kb: KnowledgeBase) => KnowledgeBase): void => {
    setKnowledgeBases((prev) => prev.map((kb) => (kb.id === id ? updater(kb) : kb)));
  }, []);

  const touch = (kb: KnowledgeBase, type: KnowledgeActivityType, message: string): KnowledgeBase => ({
    ...kb,
    updatedAt: nowStamp(),
    activity: [makeActivity(kb.id, type, message), ...kb.activity],
  });

  const createKnowledgeBase = useCallback((input: { name: string; description: string }): KnowledgeBase => {
    const stamp = nowStamp();
    const id = `kb-${Date.now().toString(36)}`;
    const created: KnowledgeBase = {
      id,
      name: input.name.trim(),
      description: input.description.trim(),
      disabled: false,
      indexStatus: 'pending',
      lastIndexedAt: null,
      sources: [],
      assignedAgentIds: [],
      metadata: { visibility: 'workspace' },
      createdAt: stamp,
      updatedAt: stamp,
      activity: [makeActivity(id, 'created', 'Knowledge base created.')],
    };
    setKnowledgeBases((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateKnowledgeBase = useCallback(
    (id: string, input: { name: string; description: string }): void => {
      mutate(id, (kb) => touch({ ...kb, name: input.name.trim(), description: input.description.trim() }, 'updated', 'Knowledge base updated.'));
    },
    [mutate],
  );

  const deleteKnowledgeBase = useCallback((id: string): void => {
    setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== id));
  }, []);

  const duplicateKnowledgeBase = useCallback(
    (id: string): KnowledgeBase | null => {
      const source = knowledgeBases.find((kb) => kb.id === id);
      if (!source) return null;
      const stamp = nowStamp();
      const newId = `kb-${Date.now().toString(36)}`;
      const copy: KnowledgeBase = {
        id: newId,
        name: `${source.name} (Copy)`,
        description: source.description,
        disabled: false,
        indexStatus: 'pending',
        lastIndexedAt: null,
        metadata: { ...source.metadata },
        assignedAgentIds: [],
        createdAt: stamp,
        updatedAt: stamp,
        sources: source.sources.map((src, index) => ({
          ...src,
          id: `${newId}-src-${index}`,
          status: 'pending',
          createdAt: stamp,
          updatedAt: stamp,
        })),
        activity: [makeActivity(newId, 'duplicated', `Duplicated from ${source.name}.`)],
      };
      setKnowledgeBases((prev) => [copy, ...prev]);
      return copy;
    },
    [knowledgeBases],
  );

  const disableKnowledgeBase = useCallback(
    (id: string): void => {
      mutate(id, (kb) => touch({ ...kb, disabled: true }, 'disabled', 'Knowledge base disabled.'));
    },
    [mutate],
  );

  const enableKnowledgeBase = useCallback(
    (id: string): void => {
      mutate(id, (kb) => touch({ ...kb, disabled: false }, 'enabled', 'Knowledge base enabled.'));
    },
    [mutate],
  );

  // Simulated indexing: flips pending/processing sources to indexed after a
  // short delay. A source titled with "fail" is left failed to exercise the
  // FAILED readiness path. No real network/ingestion happens.
  const runIndexing = useCallback(
    (id: string): void => {
      mutate(id, (kb) => {
        const sources = kb.sources.map((source) =>
          source.status === 'pending' || source.status === 'failed' ? { ...source, status: 'processing' as SourceStatus, updatedAt: nowStamp() } : source,
        );
        return touch({ ...kb, indexStatus: 'processing', sources }, 'source_processing', 'Indexing started.');
      });
      window.setTimeout(() => {
        setKnowledgeBases((prev) =>
          prev.map((kb) => {
            if (kb.id !== id) return kb;
            const stamp = nowStamp();
            let anyFailed = false;
            const sources = kb.sources.map((source) => {
              if (source.status !== 'processing') return source;
              const failed = source.title.toLowerCase().includes('fail');
              if (failed) anyFailed = true;
              return { ...source, status: failed ? ('failed' as SourceStatus) : ('indexed' as SourceStatus), updatedAt: stamp };
            });
            const hasIndexed = sources.some((source) => source.status === 'indexed');
            const indexStatus: ProcessingStatus = hasIndexed ? 'indexed' : 'failed';
            const activityType: KnowledgeActivityType = anyFailed && !hasIndexed ? 'index_failed' : 'index_completed';
            const message = anyFailed && !hasIndexed ? 'Indexing failed.' : 'Indexing completed.';
            return {
              ...kb,
              sources,
              indexStatus,
              lastIndexedAt: hasIndexed ? stamp : kb.lastIndexedAt,
              updatedAt: stamp,
              activity: [makeActivity(kb.id, activityType, message), ...kb.activity],
            };
          }),
        );
      }, 900);
    },
    [mutate],
  );

  const addSource = useCallback(
    (id: string, input: { type: KnowledgeSourceType; title: string }): void => {
      mutate(id, (kb) => {
        const stamp = nowStamp();
        const source: KnowledgeSource = {
          id: `${id}-src-${Date.now().toString(36)}`,
          type: input.type,
          title: input.title.trim(),
          status: 'pending',
          sizeLabel: SOURCE_TYPE_DEFAULT_SIZE[input.type],
          createdAt: stamp,
          updatedAt: stamp,
        };
        return touch({ ...kb, sources: [...kb.sources, source], indexStatus: 'pending' }, 'source_added', `Source "${source.title}" added.`);
      });
    },
    [mutate],
  );

  const updateSource = useCallback(
    (id: string, sourceId: string, input: { title: string }): void => {
      mutate(id, (kb) =>
        touch(
          { ...kb, sources: kb.sources.map((source) => (source.id === sourceId ? { ...source, title: input.title.trim(), updatedAt: nowStamp() } : source)) },
          'updated',
          'Source updated.',
        ),
      );
    },
    [mutate],
  );

  const removeSource = useCallback(
    (id: string, sourceId: string): void => {
      mutate(id, (kb) => {
        const removed = kb.sources.find((source) => source.id === sourceId);
        return touch({ ...kb, sources: kb.sources.filter((source) => source.id !== sourceId) }, 'source_removed', `Source "${removed?.title ?? sourceId}" removed.`);
      });
    },
    [mutate],
  );

  const setSourceStatus = useCallback(
    (id: string, sourceId: string, status: SourceStatus, type: KnowledgeActivityType, message: string): void => {
      mutate(id, (kb) =>
        touch(
          { ...kb, sources: kb.sources.map((source) => (source.id === sourceId ? { ...source, status, updatedAt: nowStamp() } : source)) },
          type,
          message,
        ),
      );
    },
    [mutate],
  );

  const finishSource = useCallback((id: string, sourceId: string): void => {
    window.setTimeout(() => {
      setKnowledgeBases((prev) =>
        prev.map((kb) => {
          if (kb.id !== id) return kb;
          const stamp = nowStamp();
          const sources = kb.sources.map((source) => (source.id === sourceId && source.status === 'processing' ? { ...source, status: 'indexed' as SourceStatus, updatedAt: stamp } : source));
          const hasIndexed = sources.some((source) => source.status === 'indexed');
          return {
            ...kb,
            sources,
            indexStatus: hasIndexed ? 'indexed' : kb.indexStatus,
            lastIndexedAt: hasIndexed ? stamp : kb.lastIndexedAt,
            updatedAt: stamp,
            activity: [makeActivity(kb.id, 'index_completed', 'Source indexed.'), ...kb.activity],
          };
        }),
      );
    }, 700);
  }, []);

  const retrySource = useCallback(
    (id: string, sourceId: string): void => {
      setSourceStatus(id, sourceId, 'processing', 'source_processing', 'Source retry started.');
      finishSource(id, sourceId);
    },
    [setSourceStatus, finishSource],
  );

  const reindexSource = useCallback(
    (id: string, sourceId: string): void => {
      setSourceStatus(id, sourceId, 'processing', 'source_processing', 'Source re-indexing.');
      finishSource(id, sourceId);
    },
    [setSourceStatus, finishSource],
  );

  const disableSource = useCallback(
    (id: string, sourceId: string): void => setSourceStatus(id, sourceId, 'disabled', 'updated', 'Source disabled.'),
    [setSourceStatus],
  );

  const enableSource = useCallback(
    (id: string, sourceId: string): void => setSourceStatus(id, sourceId, 'pending', 'updated', 'Source re-enabled.'),
    [setSourceStatus],
  );

  const assignAgent = useCallback(
    (knowledgeBaseId: string, agentId: string): void => {
      mutate(knowledgeBaseId, (kb) =>
        kb.assignedAgentIds.includes(agentId)
          ? kb
          : touch({ ...kb, assignedAgentIds: [...kb.assignedAgentIds, agentId] }, 'agent_assigned', 'Assigned to an agent.'),
      );
    },
    [mutate],
  );

  const removeAgent = useCallback(
    (knowledgeBaseId: string, agentId: string): void => {
      mutate(knowledgeBaseId, (kb) =>
        touch({ ...kb, assignedAgentIds: kb.assignedAgentIds.filter((existing) => existing !== agentId) }, 'agent_removed', 'Removed from an agent.'),
      );
    },
    [mutate],
  );

  const logActivity = useCallback(
    (id: string, type: KnowledgeActivityType, message: string): void => {
      mutate(id, (kb) => touch(kb, type, message));
    },
    [mutate],
  );

  const value = useMemo<KnowledgeRegistryContextValue>(
    () => ({
      knowledgeBases,
      getKnowledgeBaseById,
      createKnowledgeBase,
      updateKnowledgeBase,
      deleteKnowledgeBase,
      duplicateKnowledgeBase,
      disableKnowledgeBase,
      enableKnowledgeBase,
      reindexKnowledgeBase: runIndexing,
      startIndexing: runIndexing,
      addSource,
      updateSource,
      removeSource,
      retrySource,
      disableSource,
      enableSource,
      reindexSource,
      assignAgent,
      removeAgent,
      logActivity,
    }),
    [
      knowledgeBases,
      getKnowledgeBaseById,
      createKnowledgeBase,
      updateKnowledgeBase,
      deleteKnowledgeBase,
      duplicateKnowledgeBase,
      disableKnowledgeBase,
      enableKnowledgeBase,
      runIndexing,
      addSource,
      updateSource,
      removeSource,
      retrySource,
      disableSource,
      enableSource,
      reindexSource,
      assignAgent,
      removeAgent,
      logActivity,
    ],
  );

  return <KnowledgeRegistryContext.Provider value={value}>{children}</KnowledgeRegistryContext.Provider>;
}

export function useKnowledgeRegistry(): KnowledgeRegistryContextValue {
  const context = useContext(KnowledgeRegistryContext);
  if (!context) {
    throw new Error('useKnowledgeRegistry must be used within a KnowledgeRegistryProvider');
  }
  return context;
}

export const KNOWLEDGE_SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  document: 'Document',
  url: 'URL',
  text: 'Text',
  faq: 'FAQ',
};
