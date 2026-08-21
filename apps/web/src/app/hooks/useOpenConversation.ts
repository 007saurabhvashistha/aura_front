import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useCompanionRegistry } from '../../admin/hooks/useCompanionRegistry';
import type { SocialProfile } from '../../admin/hooks/useSocialRegistry';

/** Opens the existing thread with a profile, or starts one, then navigates to it. */
export function useOpenConversation() {
  const navigate = useNavigate();
  const { getConversationsForProfile, startConversation } = useConversationRegistry();
  const { can } = useCompanionRegistry();

  return useCallback(
    async (profile: SocialProfile) => {
      if (!can(profile.id, 'message')) return;
      const existing = getConversationsForProfile(profile.id).find((item) => item.status !== 'archived');
      const conversation =
        existing ?? (await startConversation({ profileId: profile.id, channel: 'chat', topic: `Chat with ${profile.displayName}` }));
      if (conversation) navigate(`/app/chats/${conversation.id}`);
    },
    [can, getConversationsForProfile, startConversation, navigate],
  );
}
