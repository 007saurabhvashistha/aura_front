import type { InteractionTraceStep } from '../social';
import type { CompanionMemoryItem, CompanionPersona, CompanionRelationship } from './CompanionService';

export interface LlmGatewayRequest {
  companionId: string;
  agentId: string;
  userMessage: string;
  persona: CompanionPersona;
  relationship: CompanionRelationship;
  memories: CompanionMemoryItem[];
  conversationContext: unknown;
}

export interface LlmGatewayResponse {
  text: string;
  trace: InteractionTraceStep[];
  memoryCandidates: string[];
  relationshipDelta: Partial<CompanionRelationship>;
}

export interface LlmGateway {
  mode: 'DEMO' | 'REAL' | 'BACKEND_REQUIRED';
  generate(request: LlmGatewayRequest): LlmGatewayResponse;
}

const DEMO_REPLIES = [
  'Got it, tell me more.',
  'That makes sense. How are you feeling about it?',
  'Nice one. What happened after that?',
  'I hear you. Want to talk it through?',
  'Sounds good to me.',
];

function pickReply(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  return DEMO_REPLIES[hash % DEMO_REPLIES.length];
}

export class SimulatedLlmGateway implements LlmGateway {
  readonly mode = 'DEMO' as const;

  generate(request: LlmGatewayRequest): LlmGatewayResponse {
    const trace: InteractionTraceStep[] = [
      {
        id: 'llm-gateway-persona',
        stage: 'agent',
        label: 'Persona assembled',
        detail: `${request.persona.personality.join(', ') || 'base persona'} · ${request.persona.speakingStyle.tone}`,
        status: 'passed',
        latencyMs: 12,
      },
      {
        id: 'llm-gateway-context',
        stage: 'knowledge',
        label: 'Relationship and memory context',
        detail: `Level ${request.relationship.relationshipLevel}; ${request.memories.length} demo memory item(s).`,
        status: 'passed',
        latencyMs: 9,
      },
      {
        id: 'llm-gateway-model',
        stage: 'integration',
        label: 'LLM Gateway · DEMO',
        detail: 'No production model was called. Response came from the simulated gateway contract.',
        status: 'passed',
        latencyMs: 20,
      },
    ];

    return {
      text: pickReply(`${request.agentId}:${request.userMessage}`),
      trace,
      memoryCandidates: request.userMessage.trim() ? [request.userMessage.trim()] : [],
      relationshipDelta: { interactionCount: request.relationship.interactionCount + 1 },
    };
  }
}

export const simulatedLlmGateway: LlmGateway = new SimulatedLlmGateway();