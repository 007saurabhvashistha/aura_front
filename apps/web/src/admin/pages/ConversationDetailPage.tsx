import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { DemoNotice } from '../components/DemoNotice';
import { EntityBadge } from '../components/EntityBadge';
import { InteractionTrace } from '../components/InteractionTrace';
import { callStatusBadge, conversationStatusBadge } from '../components/statusMaps';
import { useConversationRegistry, type CallKind } from '../hooks/useConversationRegistry';
import { CHANNEL_LABELS } from '../services/social';

const TABS = ['transcript', 'trace', 'calls', 'activity'] as const;
type DetailTab = (typeof TABS)[number];

export function ConversationDetailPage() {
  const { conversationId, tab } = useParams<{ conversationId: string; tab?: string }>();
  const navigate = useNavigate();
  const {
    getConversationById,
    getCallsForConversation,
    sendMessage,
    endConversation,
    archiveConversation,
    startCall,
    advanceCall,
    endCall,
  } = useConversationRegistry();

  const [draft, setDraft] = useState('');

  const conversation = conversationId ? getConversationById(conversationId) : null;
  const activeTab: DetailTab = TABS.includes((tab ?? 'transcript') as DetailTab)
    ? ((tab ?? 'transcript') as DetailTab)
    : 'transcript';

  if (!conversation) {
    return (
      <div className="admin-page">
        <ErrorState
          title="Conversation not found"
          description="This conversation no longer exists in the in-memory demo state."
          action={<Link to="/admin/conversations" className="btn btn-primary">Back to Conversations</Link>}
        />
      </div>
    );
  }

  const isAi = conversation.entityType === 'AI';
  const calls = getCallsForConversation(conversation.id);
  const status = conversationStatusBadge(conversation.status);

  const goToTab = (value: string) => navigate(`/admin/conversations/${conversation.id}/${value}`);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(conversation.id, draft.trim());
    setDraft('');
  };

  const handleStartCall = (kind: CallKind) => {
    startCall(conversation.id, kind);
    goToTab('calls');
  };

  return (
    <div className="admin-page">
      <PageHeader
        title={conversation.participantName}
        description={`${conversation.topic} · ${conversation.participantHandle}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Conversations', href: '/admin/conversations' },
          { label: conversation.participantName },
        ]}
        actions={[
          { label: 'Open profile', variant: 'secondary', href: `/admin/people/${conversation.profileId}` },
          ...(conversation.status === 'live'
            ? [{ label: 'End conversation', variant: 'ghost' as const, onClick: () => endConversation(conversation.id) }]
            : []),
          ...(conversation.status !== 'archived'
            ? [{ label: 'Archive', variant: 'ghost' as const, onClick: () => archiveConversation(conversation.id) }]
            : []),
        ]}
      />

      <div className="admin-detail-statusbar">
        <EntityBadge type={conversation.entityType} />
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="admin-cell-sub">
          {CHANNEL_LABELS[conversation.channel]} · started {conversation.startedAt}
        </span>
        <div className="admin-detail-statusbar-actions">
          {isAi && conversation.agentId ? (
            <Link to={`/admin/agents/${conversation.agentId}`} className="btn btn-ghost">
              Open agent
            </Link>
          ) : (
            <span className="admin-cell-sub">No AI model is involved in this conversation.</span>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { label: 'Transcript', value: 'transcript', count: conversation.messages.length },
          { label: isAi ? 'AI trace' : 'Delivery trace', value: 'trace', count: conversation.lastTrace.length },
          { label: 'Calls', value: 'calls', count: calls.length },
          { label: 'Activity', value: 'activity', count: conversation.activity.length },
        ]}
        active={activeTab}
        onChange={goToTab}
      />

      {activeTab === 'transcript' && (
        <Card
          title="Transcript"
          description={
            isAi
              ? 'Replies are produced by the linked agent and labelled as AI.'
              : 'Replies come from a real person. Nothing here is model generated.'
          }
        >
          {conversation.messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Send the first message to start this conversation." />
          ) : (
            <ol className="se-transcript">
              {conversation.messages.map((message) => (
                <li key={message.id} className={`se-message is-${message.author}`}>
                  <div className="se-message-head">
                    <span className="admin-cell-title">{message.authorName}</span>
                    {message.entityType && <EntityBadge type={message.entityType} compact />}
                    {message.status === 'failed' && <Badge variant="danger">Failed</Badge>}
                    <span className="admin-cell-sub">{message.timestamp}</span>
                  </div>
                  <p className="se-message-body">{message.text}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="se-composer">
            <Input
              placeholder={isAi ? 'Message this AI character' : `Message ${conversation.participantName}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <Button variant="primary" onClick={handleSend} disabled={!draft.trim()}>
              Send
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'trace' && (
        <Card
          title={isAi ? 'AI turn trace' : 'Delivery trace'}
          description={
            isAi
              ? 'Input → Agent → Knowledge / Tools → Integration → Output. Verdicts are derived from registry readiness.'
              : 'Input → Delivery → Reply. No agent, knowledge, or model is involved.'
          }
        >
          {conversation.lastTrace.length === 0 ? (
            <EmptyState
              title="No trace yet"
              description="Send a message in the transcript tab to produce a trace for the last turn."
            />
          ) : (
            <>
              {conversation.errors.length > 0 && (
                <ul className="se-error-list">
                  {conversation.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              <InteractionTrace steps={conversation.lastTrace} />
            </>
          )}
        </Card>
      )}

      {activeTab === 'calls' && (
        <>
          {isAi ? (
            <DemoNotice message="Person-to-person calls are only available with real people. AI characters use the agent voice pipeline — test it from the Test Center." />
          ) : (
            <Card title="Start a call" description="Calls run the full lifecycle: requested → ringing → connecting → active → ended.">
              <div className="admin-row-actions">
                <Button variant="primary" onClick={() => handleStartCall('video')}>
                  Start video call
                </Button>
                <Button variant="secondary" onClick={() => handleStartCall('voice')}>
                  Start voice call
                </Button>
              </div>
            </Card>
          )}

          {calls.length === 0 ? (
            <EmptyState
              title="No call sessions"
              description={
                isAi
                  ? 'AI characters do not place person-to-person calls.'
                  : 'Start a call to see its lifecycle, events, and transport trace.'
              }
            />
          ) : (
            calls.map((call) => {
              const callStatus = callStatusBadge(call.status);
              const terminal = call.status === 'ended' || call.status === 'failed' || call.status === 'declined';
              return (
                <Card
                  key={call.id}
                  title={`${call.kind === 'video' ? 'Video' : 'Voice'} call · ${call.participantName}`}
                  description={`Started ${call.startedAt}${call.endedAt ? ` · ended ${call.endedAt}` : ''}`}
                >
                  <div className="admin-detail-statusbar">
                    <EntityBadge type={call.entityType} compact />
                    <Badge variant={callStatus.variant}>{callStatus.label}</Badge>
                    <div className="admin-detail-statusbar-actions">
                      {!terminal && (
                        <>
                          <Button variant="primary" size="sm" onClick={() => advanceCall(call.id)}>
                            Advance lifecycle
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => endCall(call.id)}>
                            End call
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <ol className="admin-timeline">
                    {call.events.map((event) => (
                      <li key={event.id} className="admin-timeline-item">
                        <span className="admin-timeline-dot" aria-hidden="true" />
                        <div>
                          <p className="admin-cell-title">{callStatusBadge(event.status).label}</p>
                          <p className="admin-cell-sub">{event.note} · {event.timestamp}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {call.trace.length > 0 && <InteractionTrace steps={call.trace} />}
                </Card>
              );
            })
          )}
        </>
      )}

      {activeTab === 'activity' && (
        <Card
          title="Conversation activity"
          description="Also aggregated into the global Activity feed."
          footer={
            <Link to={`/admin/activity?resourceId=${conversation.id}&resourceType=conversation`} className="cp-card-footer-link">
              View in Activity →
            </Link>
          }
        >
          {conversation.activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Actions on this conversation will appear here." />
          ) : (
            <ol className="admin-timeline">
              {conversation.activity.map((entry) => (
                <li key={entry.id} className="admin-timeline-item">
                  <span className="admin-timeline-dot" aria-hidden="true" />
                  <div>
                    <p className="admin-cell-title">{entry.message}</p>
                    <p className="admin-cell-sub">{entry.actor} · {entry.timestamp}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
