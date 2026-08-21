import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSocialRegistry, type ProfileVisibility } from '../../admin/hooks/useSocialRegistry';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useCompanionRegistry } from '../../admin/hooks/useCompanionRegistry';
import { AppHeader } from '../components/AppShell';
import { StoryViewer } from '../components/StoryViewer';
import { PostViewer } from '../components/PostViewer';
import { SafetySheet } from '../components/SafetySheet';
import { Avatar, FollowButton, PRESENCE_TEXT, useCurrentProfileId } from '../components/identity';
import { useOpenConversation } from '../hooks/useOpenConversation';

type Composer = 'story' | 'post' | null;

export function ProfileViewPage({ self = false }: { self?: boolean }) {
  const params = useParams<{ profileId: string }>();
  const currentProfileId = useCurrentProfileId();
  const profileId = self ? currentProfileId ?? '' : params.profileId ?? '';
  const navigate = useNavigate();
  const { profiles, loading, createStory, createPost, expireStory, removePost } = useSocialRegistry();
  const { getConversationsForProfile, startConversation } = useConversationRegistry();
  const { can, channelAvailable } = useCompanionRegistry();
  const openConversation = useOpenConversation();

  const [showStories, setShowStories] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [composer, setComposer] = useState<Composer>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');

  const profile = useMemo(() => profiles.find((item) => item.id === profileId) ?? null, [profiles, profileId]);
  const isSelf = Boolean(profile && profile.id === currentProfileId);

  if (!profile) {
    return (
      <>
        <AppHeader title="Profile" />
        <div className="aa-main">
          <p className="aa-empty" style={{ margin: 16 }}>
            {loading ? 'Loading profile…' : 'This profile is not available.'}
          </p>
        </div>
      </>
    );
  }

  const activeStories = profile.stories.filter((story) => story.status === 'active');
  const openPost = openPostId ? profile.posts.find((post) => post.id === openPostId) ?? null : null;
  const canMessage = can(profile.id, 'message');
  const canFollow = can(profile.id, 'follow');
  const canPost = can(profile.id, 'posts');
  const canStory = can(profile.id, 'stories');
  const canVideo = channelAvailable(profile.id, 'video');

  const startVideoCall = async () => {
    if (!canVideo) return;
    const existing = getConversationsForProfile(profile.id).find((item) => item.status !== 'archived');
    const conversation =
      existing ??
      (await startConversation({ profileId: profile.id, channel: 'video', topic: `Video call with ${profile.displayName}` }));
    if (conversation) navigate(`/app/chats/${conversation.id}?call=video`);
  };

  const submitComposer = () => {
    if (!caption.trim()) return;
    if (composer === 'story' && canStory) {
      createStory(profile.id, { caption: caption.trim(), mediaLabel: 'Photo · 1080x1920' });
    } else if (composer === 'post' && canPost) {
      createPost(profile.id, { caption: caption.trim(), mediaLabel: 'Photo · 4:5', visibility });
    }
    setCaption('');
    setComposer(null);
  };

  return (
    <>
      <AppHeader
        title={profile.displayName}
        subtitle={profile.handle}
        back={
          self ? undefined : (
            <button type="button" className="aa-btn is-sm is-ghost" onClick={() => navigate(-1)}>
              ←
            </button>
          )
        }
        actions={
          isSelf ? (
            <Link className="aa-btn is-sm is-ghost" to="/app/settings" aria-label="Settings">
              ⚙
            </Link>
          ) : (
            <button
              type="button"
              className="aa-btn is-sm is-ghost"
              aria-label={`More options for ${profile.displayName}`}
              onClick={() => setShowSafety(true)}
            >
              ⋯
            </button>
          )
        }
      />
      <div className="aa-main">
        <div className="aa-profile-head">
          <Avatar profile={profile} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16 }}>{profile.displayName}</strong>
              {profile.verified ? <span className="aa-person-handle">✔ Verified</span> : null}
            </div>
            <div className="aa-person-handle">
              {profile.headline} · {PRESENCE_TEXT[profile.presence]}
            </div>
            <div className="aa-profile-stats">
              <span>
                <b>{profile.followers}</b> followers
              </span>
              <span>
                <b>{profile.following}</b> following
              </span>
              <span>
                <b>{profile.posts.length}</b> posts
              </span>
            </div>
          </div>
        </div>

        <p className="aa-bio">{profile.bio}</p>
        {profile.type === 'AI' ? (
          <p className="aa-disclosure">
            This is an AI companion, not a person. It will not claim to be human, and it cannot post, share stories or
            join calls.
          </p>
        ) : null}
        <div className="aa-interests">
          {profile.interests.map((interest) => (
            <span key={interest} className="aa-interest">
              {interest}
            </span>
          ))}
        </div>

        <div className="aa-profile-actions">
          {isSelf ? (
            <>
              <button type="button" className="aa-btn is-primary" onClick={() => setComposer('story')} disabled={!canStory}>
                Add story
              </button>
              <button type="button" className="aa-btn" onClick={() => setComposer('post')} disabled={!canPost}>
                New post
              </button>
            </>
          ) : (
            <>
              <button type="button" className="aa-btn is-primary" onClick={() => openConversation(profile)} disabled={!canMessage}>
                Message
              </button>
              {canFollow ? <FollowButton profile={profile} size="md" /> : null}
              {canVideo ? (
                <button type="button" className="aa-btn" onClick={startVideoCall}>
                  Video call
                </button>
              ) : null}
            </>
          )}
        </div>

        <section>
          <h2 className="aa-section-title" style={{ padding: '0 16px' }}>
            Stories
          </h2>
          {activeStories.length === 0 ? (
            <p className="aa-empty" style={{ margin: '0 16px' }}>
              No active stories.
            </p>
          ) : (
            <div className="aa-rail">
              {activeStories.map((story) => (
                <button key={story.id} type="button" className="aa-rail-item" onClick={() => setShowStories(true)}>
                  <span className="aa-rail-ring">
                    <Avatar profile={profile} />
                  </span>
                  <span className="aa-rail-name">{story.caption}</span>
                </button>
              ))}
            </div>
          )}
          {isSelf && activeStories.length > 0 ? (
            <div style={{ padding: '0 16px 8px' }}>
              <button
                type="button"
                className="aa-btn is-sm is-ghost"
                onClick={() => expireStory(profile.id, activeStories[0].id)}
              >
                Expire newest story
              </button>
            </div>
          ) : null}
        </section>

        <section style={{ paddingBottom: 16 }}>
          <h2 className="aa-section-title" style={{ padding: '0 16px' }}>
            Posts
          </h2>
          {profile.posts.length === 0 ? (
            <p className="aa-empty" style={{ margin: '0 16px' }}>
              No posts yet.
            </p>
          ) : (
            <div className="aa-grid">
              {profile.posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="aa-grid-tile"
                  title={post.caption}
                  onClick={() => setOpenPostId(post.id)}
                >
                  {post.caption}
                </button>
              ))}
            </div>
          )}
          {isSelf && profile.posts.length > 0 ? (
            <div style={{ padding: '10px 16px 0' }}>
              <button
                type="button"
                className="aa-btn is-sm is-ghost"
                onClick={() => removePost(profile.id, profile.posts[0].id)}
              >
                Remove newest post
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {showStories ? <StoryViewer profile={profile} onClose={() => setShowStories(false)} /> : null}
      {openPost ? <PostViewer profile={profile} post={openPost} onClose={() => setOpenPostId(null)} /> : null}
      {showSafety ? (
        <SafetySheet
          profileId={profile.id}
          displayName={profile.displayName}
          onClose={() => setShowSafety(false)}
          onBlocked={() => navigate('/app', { replace: true })}
        />
      ) : null}

      {composer ? (
        <>
          <button type="button" className="aa-backdrop" aria-label="Close" onClick={() => setComposer(null)} />
          <div className="aa-sheet">
            <h3>{composer === 'story' ? 'New story' : 'New post'}</h3>
            <textarea
              className="aa-textarea"
              placeholder={composer === 'story' ? 'What is happening right now?' : 'Write a caption'}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              aria-label="Caption"
            />
            {composer === 'post' ? (
              <select
                className="aa-select"
                style={{ marginTop: 10 }}
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as ProfileVisibility)}
                aria-label="Visibility"
              >
                <option value="public">Public</option>
                <option value="followers">Followers only</option>
              </select>
            ) : null}
            <div className="aa-sheet-row">
              <button type="button" className="aa-btn" onClick={() => setComposer(null)}>
                Cancel
              </button>
              <button type="button" className="aa-btn is-primary" onClick={submitComposer} disabled={!caption.trim()}>
                Publish
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
