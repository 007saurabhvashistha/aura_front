import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useSocialRegistry } from '../../admin/hooks/useSocialRegistry';
import { AppHeader } from '../components/AppShell';
import { Avatar, shortTime, useCurrentProfileId } from '../components/identity';

export function ChatsPage() {
  const { conversations } = useConversationRegistry();
  const { profiles } = useSocialRegistry();
  const currentProfileId = useCurrentProfileId();

  const visible = useMemo(
    () =>
      conversations
        .filter((item) => item.status !== 'archived' && item.profileId !== currentProfileId)
        .slice()
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)),
    [conversations, currentProfileId],
  );

  return (
    <>
      <AppHeader title="Chats" subtitle="Everyone you are talking to." />
      <div className="aa-main is-flush">
        {visible.length === 0 ? (
          <p className="aa-empty" style={{ margin: 16 }}>
            No conversations yet. Start one from Discover.
          </p>
        ) : (
          <div className="aa-conv-list">
            {visible.map((conversation) => {
              const profile = profiles.find((item) => item.id === conversation.profileId);
              const last = conversation.messages[conversation.messages.length - 1];
              const unread = conversation.unreadCount ?? 0;
              return (
                <Link
                  key={conversation.id}
                  className={`aa-conv${unread > 0 ? ' is-unread' : ''}`}
                  to={`/app/chats/${conversation.id}`}
                >
                  {profile ? (
                    <Avatar profile={profile} />
                  ) : (
                    <span className="aa-avatar">?</span>
                  )}
                  <span className="aa-conv-body">
                    <span className="aa-conv-top">
                      <span className="aa-conv-name">{conversation.participantName}</span>
                    </span>
                    <span className="aa-conv-preview">
                      {last ? `${last.author === 'operator' ? 'You: ' : ''}${last.text}` : conversation.topic}
                    </span>
                  </span>
                  <span className="aa-conv-meta">
                    <span className="aa-conv-time">{shortTime(conversation.lastActivityAt)}</span>
                    {unread > 0 ? <span className="aa-conv-unread">{unread}</span> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
