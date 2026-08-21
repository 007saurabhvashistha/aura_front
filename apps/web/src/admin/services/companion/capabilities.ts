import type { IntegrationRecord } from '../../hooks/useIntegrationRegistry';
import type { SocialProfile } from '../../hooks/useSocialRegistry';
import type { CompanionCapabilityKey, CompanionSource, ResolvedCapability } from './CompanionService';

const ALL_CAPABILITIES: CompanionCapabilityKey[] = [
  'message',
  'voice',
  'video',
  'stories',
  'posts',
  'follow',
  'ai_reply',
  'memory',
  'relationship',
];

function realtimeReady(integrations: IntegrationRecord[]): boolean {
  return integrations.some((integration) => integration.capability === 'realtime' && integration.enabled && integration.status === 'connected');
}

export function resolveCapabilities(input: {
  profile: SocialProfile;
  integrations: IntegrationRecord[];
  source: CompanionSource;
  isSelf: boolean;
}): ResolvedCapability[] {
  const isAi = input.profile.type === 'AI';
  const hasRealtime = realtimeReady(input.integrations);

  return ALL_CAPABILITIES.map((key) => {
    if (key === 'message') {
      return { key, available: true, mode: input.source, reason: 'Messaging is available for all companions.' };
    }
    if (key === 'follow') {
      return {
        key,
        available: !isAi && !input.isSelf,
        mode: input.source,
        reason: isAi
          ? 'Follow is a real-person social capability.'
          : input.isSelf
            ? 'The current user cannot follow their own profile.'
            : 'Follow is available for real-person profiles.',
      };
    }
    if (key === 'stories' || key === 'posts') {
      return {
        key,
        available: !isAi,
        mode: input.source,
        reason: isAi ? 'Stories and posts are real-person social capabilities.' : 'Real people can publish social content.',
      };
    }
    if (key === 'video') {
      return {
        key,
        available: !isAi,
        mode: hasRealtime ? input.source : 'DEMO',
        reason: isAi
          ? 'Video calls are not an AI companion capability; AI uses the voice/agent path.'
          : hasRealtime
            ? 'Video uses the realtime transport abstraction.'
            : 'Video is available as a demo transport until realtime is connected.',
      };
    }
    if (key === 'voice') {
      return {
        key,
        available: true,
        mode: isAi ? 'BACKEND_REQUIRED' : hasRealtime ? input.source : 'DEMO',
        reason: isAi
          ? 'AI voice requires the future companion voice engine.'
          : 'Real-person voice uses realtime transport.',
      };
    }
    if (key === 'ai_reply') {
      return {
        key,
        available: isAi && Boolean(input.profile.agentId),
        mode: 'DEMO',
        reason: isAi && input.profile.agentId ? 'AI replies route through the demo LLM gateway.' : 'Only agent-backed AI companions can generate replies.',
      };
    }
    return {
      key,
      available: isAi,
      mode: isAi ? 'DEMO' : 'BACKEND_REQUIRED',
      reason: isAi ? 'AI companion engine foundation is available in demo mode.' : 'Relationship and memory persistence are future backend work.',
    };
  });
}

export function hasCapability(capabilities: ResolvedCapability[], key: CompanionCapabilityKey): boolean {
  return capabilities.some((capability) => capability.key === key && capability.available);
}