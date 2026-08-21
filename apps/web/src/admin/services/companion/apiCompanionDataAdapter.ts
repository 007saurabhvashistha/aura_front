import { apiRequest } from '../../../lib/api';
import type {
  CompanionDataService,
  CompanionEngineStatus,
  CompanionState,
} from './CompanionDataService';
import type { CompanionMemoryItem, CompanionMemoryLayer, CompanionPersona, CompanionRelationship } from './index';

const BASE = '/api/v1/companions';

interface ApiPersona {
  agentId: string;
  personality: string[];
  traits: string[];
  preferences: string[];
  boundaries: string[];
  backstory: string;
  relationshipStyle: string;
  speakingStyle: {
    languageMode: string;
    tone: string;
    replyLength: 'short' | 'medium' | 'long';
    examples: string[];
  };
}

interface ApiRelationship {
  viewerProfileId: string;
  companionProfileId: string;
  relationshipLevel: number;
  trust: number;
  affection: number;
  familiarity: number;
  mood: string;
  interactionCount: number;
  lastInteractionAt: string | null;
}

interface ApiMemory {
  id: string;
  viewerProfileId: string;
  companionProfileId: string;
  layer: CompanionMemoryLayer;
  content: string;
  importance: number;
  status: 'active' | 'archived';
  sourceConversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiCompanionDetail {
  persona: ApiPersona | null;
  relationship: ApiRelationship;
}

function toPersona(persona: ApiPersona, companionId: string): CompanionPersona {
  return {
    companionId,
    agentId: persona.agentId,
    personality: persona.personality,
    backstory: persona.backstory,
    speakingStyle: persona.speakingStyle,
    traits: persona.traits,
    preferences: persona.preferences,
    boundaries: persona.boundaries,
    relationshipStyle: persona.relationshipStyle,
    source: 'REAL',
  };
}

function toRelationship(relationship: ApiRelationship, companionId: string): CompanionRelationship {
  return {
    viewerProfileId: relationship.viewerProfileId,
    companionId,
    relationshipLevel: relationship.relationshipLevel,
    trust: relationship.trust,
    affection: relationship.affection,
    familiarity: relationship.familiarity,
    mood: relationship.mood,
    interactionCount: relationship.interactionCount,
    lastInteractionAt: relationship.lastInteractionAt,
    source: 'REAL',
  };
}

function toMemory(memory: ApiMemory, companionId: string): CompanionMemoryItem {
  return {
    id: memory.id,
    companionId,
    viewerProfileId: memory.viewerProfileId,
    layer: memory.layer,
    text: memory.content,
    importance: memory.importance,
    status: memory.status,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    sourceConversationId: memory.sourceConversationId ?? undefined,
    source: 'REAL',
  };
}

export class ApiCompanionDataAdapter implements CompanionDataService {
  readonly mode = 'REAL' as const;

  async engineStatus(): Promise<CompanionEngineStatus> {
    return apiRequest<CompanionEngineStatus>(`${BASE}/engine/status`);
  }

  async loadState(companionId: string, profileId: string): Promise<CompanionState> {
    const [detail, memories] = await Promise.all([
      apiRequest<ApiCompanionDetail>(`${BASE}/${profileId}`),
      apiRequest<ApiMemory[]>(`${BASE}/${profileId}/memories`),
    ]);

    return {
      persona: detail.persona ? toPersona(detail.persona, companionId) : null,
      relationship: toRelationship(detail.relationship, companionId),
      memories: memories.map((memory) => toMemory(memory, companionId)),
    };
  }
}

export const apiCompanionDataService: CompanionDataService = new ApiCompanionDataAdapter();
