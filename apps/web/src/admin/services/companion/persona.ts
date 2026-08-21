import type { ControlPlaneAgent } from '../../hooks/useAgentRegistry';
import type { Companion, CompanionPersona } from './CompanionService';

function splitList(value: string): string[] {
  return value
    .split(/[,.]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function demoPersonaFor(companion: Companion, agent: ControlPlaneAgent | null): CompanionPersona | null {
  if (companion.type !== 'AI' || !agent) return null;
  const config = agent.config;

  return {
    companionId: companion.id,
    agentId: agent.id,
    personality: splitList(config.personality || 'warm, emotionally attentive'),
    backstory: agent.description || 'Aura AI companion profile. Detailed backstory is backend-required.',
    speakingStyle: {
      languageMode: config.language || 'mirror_user',
      tone: config.tone || 'empathetic',
      replyLength: 'short',
      examples: config.conversationRules ? [config.conversationRules] : [],
    },
    traits: splitList(config.goals || 'supportive, natural'),
    preferences: splitList(config.knowledgeSources || ''),
    boundaries: splitList(config.restrictions || 'Do not claim to be human'),
    relationshipStyle: config.personality || 'Warm companion',
    source: 'DEMO',
  };
}