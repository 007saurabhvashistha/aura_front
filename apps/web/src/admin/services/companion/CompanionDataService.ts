import type { CompanionMemoryItem, CompanionPersona, CompanionRelationship } from './index';

export type CompanionDataMode = 'DEMO' | 'REAL';

export interface CompanionEngineStatus {
  provider: string;
  model: string;
  ready: boolean;
  streaming: boolean;
  moderation: string;
  health: {
    circuit: 'closed' | 'open' | 'half_open';
    consecutiveFailures: number;
    lastErrorCode: string | null;
    lastErrorAt: string | null;
    lastSuccessAt: string | null;
    retryAfterMs: number | null;
  };
}

export interface CompanionState {
  persona: CompanionPersona | null;
  relationship: CompanionRelationship;
  memories: CompanionMemoryItem[];
}

/**
 * Read port for persisted companion state. The demo path stays as the fallback, so a
 * backend outage degrades to derived state instead of breaking the surface.
 */
export interface CompanionDataService {
  readonly mode: CompanionDataMode;
  engineStatus(): Promise<CompanionEngineStatus>;
  loadState(companionId: string, profileId: string): Promise<CompanionState>;
}
