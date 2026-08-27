import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useCompanionRegistry } from '../../admin/hooks/useCompanionRegistry';
import { useSocialRegistry } from '../../admin/hooks/useSocialRegistry';
import { AppHeader } from '../components/AppShell';
import { Avatar, shortTime } from '../components/identity';

export function ChatThreadPage() {
  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getConversationById, getCallsForConversation, sendMessage, markRead, startCall } = useConversationRegistry();
  const { channelAvailable } = useCompanionRegistry();
  const { profiles } = useSocialRegistry();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const callRequested = useRef(false);

  const conversation = getConversationById(conversationId);
  const profile = conversation ? profiles.find((item) => item.id === conversation.profileId) ?? null : null;
  const isSending = Boolean(conversation?.messages.some((message) => message.status === 'pending'));
  const liveCall = getCallsForConversation(conversationId).find(
    (call) => call.status !== 'ended' && call.status !== 'failed' && call.status !== 'declined',
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [conversation?.messages.length]);

  useEffect(() => {
    if (conversation) markRead(conversation.id);
  }, [conversation?.id, markRead]);

  // Deep link from a profile "Video call" CTA.
  useEffect(() => {
    if (callRequested.current) return;
    if (searchParams.get('call') !== 'video') return;
    if (!conversation || !channelAvailable(conversation.profileId, 'video')) return;
    callRequested.current = true;
    const call = startCall(conversation.id, 'video');
    searchParams.delete('call');
    setSearchParams(searchParams, { replace: true });
    if (call) navigate(`/app/calls/${call.id}`, { replace: true });
  }, [conversation, searchParams, setSearchParams, startCall, navigate, channelAvailable]);

  if (!conversation) {
    return (
      <>
        <AppHeader title="Conversation" />
        <div className="aa-main">
          <p className="aa-empty" style={{ margin: 16 }}>
            This conversation is not available.
          </p>
        </div>
      </>
    );
  }

  const submit = () => {
    if (!draft.trim() || isSending) return;
    sendMessage(conversation.id, draft.trim());
    setDraft('');
  };

  const onCall = () => {
    const call = startCall(conversation.id, 'video');
    if (call) navigate(`/app/calls/${call.id}`);
  };

  return (
    <>
      <AppHeader
        title={
          <Link className="aa-link" to={`/app/u/${conversation.profileId}`}>
            {conversation.participantName}
          </Link>
        }
        subtitle={conversation.participantHandle}
        back={
          <Link className="aa-btn is-sm is-ghost" to="/app/chats">
            ←
          </Link>
        }
        actions={
          channelAvailable(conversation.profileId, 'video') ? (
            <button type="button" className="aa-btn is-sm" onClick={onCall} title="Start video call">
              Video
            </button>
          ) : null
        }
      />

      <div className="aa-main">
        {liveCall ? (
          <p className="aa-notice">
            Call in progress ·{' '}
            <Link className="aa-link" style={{ textDecoration: 'underline' }} to={`/app/calls/${liveCall.id}`}>
              Return to call
            </Link>
          </p>
        ) : null}

        <div className="aa-thread">
          {conversation.messages.map((message) => {
            if (message.author === 'system') {
              if (message.status === 'pending') {
                return (
                  <div key={message.id} className="aa-msg is-system">
                    Thinking...
                  </div>
                );
              }
              // The underlying dependency error stays in Admin; users see a neutral state.
              return (
                <div key={message.id} className="aa-msg is-system">
                  Message not delivered. Please try again.
                </div>
              );
            }
            const mine = message.author === 'operator';
            return (
              <div key={message.id} className={`aa-msg ${mine ? 'is-me' : 'is-them'}`}>
                {message.text}
                <div className="aa-msg-meta">
                  {mine ? 'You' : message.authorName} · {shortTime(message.timestamp)}
                </div>
              </div>
            );
          })}
          {profile && conversation.messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24 }}>
              <Avatar profile={profile} size="lg" />
              <strong>{profile.displayName}</strong>
              <span className="aa-person-handle">Say hello to start the conversation.</span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="aa-composer">
        <input
          className="aa-input"
          placeholder={`Message ${conversation.participantName}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          aria-label="Message"
          disabled={isSending}
        />
        <button type="button" className="aa-btn is-primary" onClick={submit} disabled={!draft.trim() || isSending}>
          {isSending ? 'Sending' : 'Send'}
        </button>
      </div>
    </>
  );
}
