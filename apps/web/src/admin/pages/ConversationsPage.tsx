import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { Tabs } from '../components/Tabs';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { EntityBadge } from '../components/EntityBadge';
import { callStatusBadge, conversationStatusBadge } from '../components/statusMaps';
import { useConversationRegistry } from '../hooks/useConversationRegistry';
import { useSocialRegistry } from '../hooks/useSocialRegistry';
import { useCompanionRegistry } from '../hooks/useCompanionRegistry';
import { CHANNEL_LABELS, type InteractionChannel } from '../services/social';

type InboxTab = 'all' | 'live' | 'history' | 'calls';

const TYPE_FILTERS = [
  { label: 'All participants', value: 'all' },
  { label: 'AI characters', value: 'AI' },
  { label: 'Real people', value: 'REAL_PERSON' },
];

const CHANNELS = Object.entries(CHANNEL_LABELS) as [InteractionChannel, string][];

export function ConversationsPage({ initialTab = 'all' }: { initialTab?: InboxTab }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations, calls, mode, startConversation, advanceCall, endCall } = useConversationRegistry();
  const { profiles } = useSocialRegistry();
  const { channelAvailable } = useCompanionRegistry();

  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') ?? 'all');
  const [channelFilter, setChannelFilter] = useState<'all' | InteractionChannel>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newProfileId, setNewProfileId] = useState('');
  const [newChannel, setNewChannel] = useState<InteractionChannel>('chat');
  const [newTopic, setNewTopic] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesSearch =
        !query ||
        conversation.participantName.toLowerCase().includes(query) ||
        conversation.participantHandle.toLowerCase().includes(query) ||
        conversation.topic.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || conversation.entityType === typeFilter;
      const matchesChannel = channelFilter === 'all' || conversation.channel === channelFilter;
      const matchesTab =
        tab === 'all' || tab === 'calls'
          ? true
          : tab === 'live'
            ? conversation.status === 'live'
            : conversation.status !== 'live';
      return matchesSearch && matchesType && matchesChannel && matchesTab;
    });
  }, [conversations, search, typeFilter, channelFilter, tab]);

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();
    return calls.filter((call) => !query || call.participantName.toLowerCase().includes(query));
  }, [calls, search]);

  const liveCount = conversations.filter((conversation) => conversation.status === 'live').length;
  const aiCount = conversations.filter((conversation) => conversation.entityType === 'AI').length;
  const peopleCount = conversations.filter((conversation) => conversation.entityType === 'REAL_PERSON').length;
  const activeCalls = calls.filter(
    (call) => call.status === 'ringing' || call.status === 'connecting' || call.status === 'active',
  ).length;

  const handleCreate = async () => {
    if (!newProfileId) return;
    if (!channelAvailable(newProfileId, newChannel)) return;
    const created = await startConversation({ profileId: newProfileId, channel: newChannel, topic: newTopic });
    setDrawerOpen(false);
    setNewProfileId('');
    setNewTopic('');
    setNewChannel('chat');
    if (created) navigate(`/admin/conversations/${created.id}`);
  };

  const selectedProfile = profiles.find((profile) => profile.id === newProfileId) ?? null;
  const availableChannels = selectedProfile
    ? CHANNELS.filter(([value]) => channelAvailable(selectedProfile.id, value))
    : CHANNELS;

  return (
    <div className="admin-page">
      <PageHeader
        title="Conversations"
        description="One inbox for AI characters and real people. Every conversation states which one it is."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Conversations' }]}
        actions={[
          { label: '+ New Conversation', variant: 'primary', onClick: () => setDrawerOpen(true) },
          { label: 'People', variant: 'secondary', href: '/admin/people' },
        ]}
      />

      <DemoNotice
        message={
          mode === 'SIMULATED'
            ? 'DEMO / SIMULATED: Conversations, AI replies, and calls run on in-memory state. AI replies are traced through real registry readiness, never randomised.'
            : 'REAL / CONNECTED: Conversations are served by the backend.'
        }
      />

      <section className="se-stat-grid">
        <Card variant="metric">
          <p className="cp-kpi-label">Live now</p>
          <p className="cp-kpi-value">{liveCount}</p>
          <p className="cp-kpi-note">{conversations.length} conversations total</p>
        </Card>
        <Card variant="metric">
          <p className="cp-kpi-label">AI characters</p>
          <p className="cp-kpi-value">{aiCount}</p>
          <p className="cp-kpi-note">Backed by agents</p>
        </Card>
        <Card variant="metric">
          <p className="cp-kpi-label">Real people</p>
          <p className="cp-kpi-value">{peopleCount}</p>
          <p className="cp-kpi-note">Human-to-human</p>
        </Card>
        <Card variant="metric">
          <p className="cp-kpi-label">Active calls</p>
          <p className="cp-kpi-value">{activeCalls}</p>
          <p className="cp-kpi-note">{calls.length} call sessions logged</p>
        </Card>
      </section>

      <Tabs
        tabs={[
          { label: 'All', value: 'all', count: conversations.length },
          { label: 'Live', value: 'live', count: liveCount },
          { label: 'History', value: 'history', count: conversations.length - liveCount },
          { label: 'Calls', value: 'calls', count: calls.length },
        ]}
        active={tab}
        onChange={(value) => setTab(value as InboxTab)}
      />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by participant or topic"
        filters={tab === 'calls' ? undefined : TYPE_FILTERS}
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
        actions={
          tab === 'calls' ? undefined : (
            <label className="admin-field">
              <select
                className="admin-select"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as 'all' | InteractionChannel)}
              >
                <option value="all">All channels</option>
                {CHANNELS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )
        }
      />

      {tab === 'calls' ? (
        filteredCalls.length === 0 ? (
          <EmptyState
            title="No calls yet"
            description="Open a real-person conversation and start a video call to see the call lifecycle here."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call) => {
                  const status = callStatusBadge(call.status);
                  const terminal = call.status === 'ended' || call.status === 'failed' || call.status === 'declined';
                  return (
                    <tr key={call.id}>
                      <td>
                        <div className="se-identity">
                          <span className="admin-cell-title">{call.participantName}</span>
                          <EntityBadge type={call.entityType} compact />
                        </div>
                      </td>
                      <td className="admin-cell-sub">{call.kind}</td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td className="admin-cell-sub">{call.startedAt}</td>
                      <td className="admin-cell-sub">{call.endedAt ?? '—'}</td>
                      <td>
                        <div className="admin-row-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/admin/conversations/${call.conversationId}/calls`)}
                          >
                            Open
                          </Button>
                          {!terminal && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => advanceCall(call.id)}>
                                Advance
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => endCall(call.id)}>
                                End
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title={conversations.length === 0 ? 'No conversations yet' : 'No matches'}
          description={
            conversations.length === 0
              ? 'Start a conversation with an AI character or a real person.'
              : 'Try a different search term or filter.'
          }
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              New Conversation
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Topic</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Last reply</th>
                <th>Messages</th>
                <th>Last activity</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((conversation) => {
                const status = conversationStatusBadge(conversation.status);
                return (
                  <tr key={conversation.id}>
                    <td>
                      <div className="se-identity">
                        <button
                          type="button"
                          className="admin-link-cell"
                          onClick={() => navigate(`/admin/conversations/${conversation.id}`)}
                        >
                          {conversation.participantName}
                        </button>
                        <EntityBadge type={conversation.entityType} compact />
                      </div>
                      <p className="admin-cell-sub">
                        {conversation.participantHandle}
                        {conversation.entityType === 'AI' && conversation.agentId
                          ? ` · agent ${conversation.agentId}`
                          : ''}
                      </p>
                    </td>
                    <td className="admin-cell-sub">{conversation.topic}</td>
                    <td className="admin-cell-sub">{CHANNEL_LABELS[conversation.channel]}</td>
                    <td><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td>
                      {conversation.lastTurnStatus === null ? (
                        <span className="admin-cell-sub">—</span>
                      ) : (
                        <Badge variant={conversation.lastTurnStatus === 'passed' ? 'success' : 'danger'}>
                          {conversation.lastTurnStatus === 'passed' ? 'Delivered' : 'Failed'}
                        </Badge>
                      )}
                    </td>
                    <td className="admin-cell-sub">{conversation.messages.length}</td>
                    <td className="admin-cell-sub">{conversation.lastActivityAt}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/conversations/${conversation.id}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Conversation"
        description="Pick a participant. AI characters reply through their agent; real people reply as humans."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newProfileId}>
              Start
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <label className="admin-field">
            <span className="admin-field-label">Participant</span>
            <select className="admin-select" value={newProfileId} onChange={(e) => setNewProfileId(e.target.value)}>
              <option value="">Select a participant</option>
              <optgroup label="AI characters">
                {profiles
                  .filter((profile) => profile.type === 'AI')
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.displayName} (AI)</option>
                  ))}
              </optgroup>
              <optgroup label="Real people">
                {profiles
                  .filter((profile) => profile.type === 'REAL_PERSON')
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.displayName} (Real person)</option>
                  ))}
              </optgroup>
            </select>
          </label>

          {selectedProfile && (
            <div className="se-identity">
              <EntityBadge type={selectedProfile.type} />
              <span className="admin-cell-sub">
                {selectedProfile.type === 'AI'
                  ? 'Replies are generated by an AI agent.'
                  : 'Replies come from a real person. Video calls are available.'}
              </span>
            </div>
          )}

          <label className="admin-field">
            <span className="admin-field-label">Channel</span>
            <select
              className="admin-select"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value as InteractionChannel)}
            >
              {availableChannels.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <Input
            label="Topic"
            placeholder="e.g. Evening check-in"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
        </div>
      </Drawer>
    </div>
  );
}
