import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { DemoNotice } from '../components/DemoNotice';
import { EntityBadge } from '../components/EntityBadge';
import { conversationStatusBadge, presenceBadge } from '../components/statusMaps';
import { useSocialRegistry, type ProfileVisibility } from '../hooks/useSocialRegistry';
import { useConversationRegistry } from '../hooks/useConversationRegistry';
import { useCompanionRegistry } from '../hooks/useCompanionRegistry';
import { CHANNEL_LABELS, ENTITY_TYPE_LABELS } from '../services/social';

const TABS = ['overview', 'posts', 'stories', 'conversations', 'activity'] as const;
type ProfileTab = (typeof TABS)[number];

export function ProfileDetailPage() {
  const { profileId, tab } = useParams<{ profileId: string; tab?: string }>();
  const navigate = useNavigate();
  const { getProfileById, createStory, expireStory, createPost, removePost, setPresence, setDiscoverable } =
    useSocialRegistry();
  const { getConversationsForProfile, startConversation } = useConversationRegistry();
  const { can } = useCompanionRegistry();

  const [storyOpen, setStoryOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaLabel, setMediaLabel] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');

  const profile = profileId ? getProfileById(profileId) : null;
  const activeTab: ProfileTab = TABS.includes((tab ?? 'overview') as ProfileTab)
    ? ((tab ?? 'overview') as ProfileTab)
    : 'overview';

  if (!profile) {
    return (
      <div className="admin-page">
        <ErrorState
          title="Profile not found"
          description="This profile no longer exists in the in-memory demo state."
          action={<Link to="/admin/people" className="btn btn-primary">Back to People</Link>}
        />
      </div>
    );
  }

  const isAi = profile.type === 'AI';
  const canMessage = can(profile.id, 'message');
  const canPost = can(profile.id, 'posts');
  const canStory = can(profile.id, 'stories');
  const conversations = getConversationsForProfile(profile.id);
  const presence = presenceBadge(profile.presence);
  const activeStories = profile.stories.filter((story) => story.status === 'active');

  const goToTab = (value: string) => navigate(`/admin/people/${profile.id}/${value}`);

  const resetComposer = () => {
    setCaption('');
    setMediaLabel('');
    setVisibility('public');
  };

  const handleCreateStory = () => {
    if (!canStory) return;
    createStory(profile.id, { caption, mediaLabel });
    setStoryOpen(false);
    resetComposer();
    goToTab('stories');
  };

  const handleCreatePost = () => {
    if (!canPost) return;
    createPost(profile.id, { caption, mediaLabel, visibility });
    setPostOpen(false);
    resetComposer();
    goToTab('posts');
  };

  const messageProfile = async () => {
    if (!canMessage) return;
    const created = await startConversation({ profileId: profile.id, channel: 'chat', topic: 'New message' });
    if (created) navigate(`/admin/conversations/${created.id}`);
  };

  return (
    <div className="admin-page">
      <PageHeader
        title={profile.displayName}
        description={`${profile.handle} · ${profile.headline}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'People', href: '/admin/people' },
          { label: profile.displayName },
        ]}
        actions={[
          { label: isAi ? 'Chat' : 'Message', variant: 'primary', onClick: messageProfile },
          ...(isAi && profile.agentId
            ? [{ label: 'Open agent', variant: 'secondary' as const, href: `/admin/agents/${profile.agentId}` }]
            : []),
        ]}
      />

      <div className="admin-detail-statusbar">
        <EntityBadge type={profile.type} />
        <Badge variant={presence.variant}>{presence.label}</Badge>
        <Badge variant={profile.discoverable ? 'info' : 'warning'}>
          {profile.discoverable ? 'In discovery' : 'Hidden'}
        </Badge>
        {profile.verified && <Badge variant="success">Verified</Badge>}
        <span className="admin-cell-sub">Joined {profile.joinedAt}</span>
      </div>

      {isAi && (
        <DemoNotice message="This is an AI character. It is backed by an agent, it is labelled as AI everywhere, and it cannot publish stories or posts." />
      )}

      <Tabs
        tabs={[
          { label: 'Overview', value: 'overview' },
          { label: 'Posts', value: 'posts', count: profile.posts.length },
          { label: 'Stories', value: 'stories', count: activeStories.length },
          { label: 'Conversations', value: 'conversations', count: conversations.length },
          { label: 'Activity', value: 'activity', count: profile.activity.length },
        ]}
        active={activeTab}
        onChange={goToTab}
      />

      {activeTab === 'overview' && (
        <>
          <Card title="About" description={ENTITY_TYPE_LABELS[profile.type]}>
            <p className="se-profile-bio">{profile.bio}</p>
            <ul className="se-chip-list">
              {profile.interests.map((interest) => (
                <li key={interest} className="se-chip">{interest}</li>
              ))}
            </ul>
            <dl className="admin-detail-grid">
              <div className="admin-detail-item"><dt>Entity type</dt><dd>{ENTITY_TYPE_LABELS[profile.type]}</dd></div>
              <div className="admin-detail-item"><dt>Handle</dt><dd>{profile.handle}</dd></div>
              <div className="admin-detail-item"><dt>Followers</dt><dd>{profile.followers}</dd></div>
              <div className="admin-detail-item"><dt>Following</dt><dd>{profile.following}</dd></div>
              <div className="admin-detail-item">
                <dt>Linked agent</dt>
                <dd>{profile.agentId ?? 'None (real person)'}</dd>
              </div>
              <div className="admin-detail-item"><dt>Presence</dt><dd>{presence.label}</dd></div>
            </dl>
          </Card>

          <Card title="Controls" description="Operator controls for this profile.">
            <div className="admin-row-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPresence(profile.id, profile.presence === 'online' ? 'offline' : 'online')}
              >
                Set {profile.presence === 'online' ? 'offline' : 'online'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiscoverable(profile.id, !profile.discoverable)}
              >
                {profile.discoverable ? 'Hide from discovery' : 'Show in discovery'}
              </Button>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'posts' && (
        <Card
          title="Posts"
          description={isAi ? 'AI characters cannot publish posts.' : 'Photos and updates shared by this person.'}
          footer={
            canPost && (
              <Button variant="primary" size="sm" onClick={() => setPostOpen(true)}>
                + New post
              </Button>
            )
          }
        >
          {profile.posts.length === 0 ? (
            <EmptyState
              title="No posts"
              description={isAi ? 'Posts are a real-person capability.' : 'Publish the first post for this profile.'}
            />
          ) : (
            <div className="se-media-grid">
              {profile.posts.map((post) => (
                <article key={post.id} className="se-media-card">
                  <div className="se-media-thumb" aria-hidden="true">{post.mediaLabel}</div>
                  <p className="admin-cell-title">{post.caption}</p>
                  <p className="admin-cell-sub">
                    {post.createdAt} · {post.visibility} · {post.likes} likes · {post.comments} comments
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => removePost(profile.id, post.id)}>
                    Remove
                  </Button>
                </article>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'stories' && (
        <Card
          title="Stories"
          description={isAi ? 'AI characters cannot publish stories.' : 'Short-lived updates from this person.'}
          footer={
            canStory && (
              <Button variant="primary" size="sm" onClick={() => setStoryOpen(true)}>
                + New story
              </Button>
            )
          }
        >
          {profile.stories.length === 0 ? (
            <EmptyState
              title="No stories"
              description={isAi ? 'Stories are a real-person capability.' : 'Publish the first story for this profile.'}
            />
          ) : (
            <div className="se-media-grid">
              {profile.stories.map((story) => (
                <article key={story.id} className={`se-media-card is-${story.status}`}>
                  <div className="se-media-thumb" aria-hidden="true">{story.mediaLabel}</div>
                  <div className="se-identity">
                    <p className="admin-cell-title">{story.caption}</p>
                    <Badge variant={story.status === 'active' ? 'success' : 'default'}>{story.status}</Badge>
                  </div>
                  <p className="admin-cell-sub">{story.createdAt} · {story.views} views</p>
                  {story.status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => expireStory(profile.id, story.id)}>
                      Expire now
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'conversations' && (
        <Card title="Conversations" description="Every conversation with this profile.">
          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations"
              description="Start a conversation from the profile header."
              action={<Button variant="primary" onClick={messageProfile}>Start conversation</Button>}
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Messages</th>
                    <th>Last activity</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conversation) => {
                    const status = conversationStatusBadge(conversation.status);
                    return (
                      <tr key={conversation.id}>
                        <td className="admin-cell-title">{conversation.topic}</td>
                        <td className="admin-cell-sub">{CHANNEL_LABELS[conversation.channel]}</td>
                        <td><Badge variant={status.variant}>{status.label}</Badge></td>
                        <td className="admin-cell-sub">{conversation.messages.length}</td>
                        <td className="admin-cell-sub">{conversation.lastActivityAt}</td>
                        <td>
                          <Link to={`/admin/conversations/${conversation.id}`} className="btn btn-ghost">Open</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card
          title="Profile activity"
          description="Also aggregated into the global Activity feed."
          footer={
            <Link to={`/admin/activity?resourceId=${profile.id}&resourceType=profile`} className="cp-card-footer-link">
              View in Activity →
            </Link>
          }
        >
          <ol className="admin-timeline">
            {profile.activity.map((entry) => (
              <li key={entry.id} className="admin-timeline-item">
                <span className="admin-timeline-dot" aria-hidden="true" />
                <div>
                  <p className="admin-cell-title">{entry.message}</p>
                  <p className="admin-cell-sub">{entry.actor} · {entry.timestamp}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Drawer
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        title="New story"
        description="Stories expire after 24 hours. Media upload is simulated in demo mode."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setStoryOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateStory} disabled={!caption.trim()}>Publish</Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input label="Caption" placeholder="What is happening right now?" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Input label="Media" placeholder="Photo · 1080x1920" value={mediaLabel} onChange={(e) => setMediaLabel(e.target.value)} />
        </div>
      </Drawer>

      <Drawer
        isOpen={postOpen}
        onClose={() => setPostOpen(false)}
        title="New post"
        description="Posts stay on the profile. Media upload is simulated in demo mode."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreatePost} disabled={!caption.trim()}>Publish</Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input label="Caption" placeholder="Say something about this post" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Input label="Media" placeholder="Photo · 4:5" value={mediaLabel} onChange={(e) => setMediaLabel(e.target.value)} />
          <label className="admin-field">
            <span className="admin-field-label">Visibility</span>
            <select
              className="admin-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}
            >
              <option value="public">Public</option>
              <option value="followers">Followers only</option>
            </select>
          </label>
        </div>
      </Drawer>
    </div>
  );
}
