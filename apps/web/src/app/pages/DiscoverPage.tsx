import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompanionRegistry } from '../../admin/hooks/useCompanionRegistry';
import { useSocialRegistry, type SocialProfile } from '../../admin/hooks/useSocialRegistry';
import { AppHeader } from '../components/AppShell';
import { StoryViewer } from '../components/StoryViewer';
import { PostViewer } from '../components/PostViewer';
import { Avatar, FollowButton, PRESENCE_TEXT, useCurrentProfileId } from '../components/identity';
import { useOpenConversation } from '../hooks/useOpenConversation';

type Filter = 'all' | 'online' | 'stories';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'For you' },
  { id: 'online', label: 'Online' },
  { id: 'stories', label: 'With stories' },
];

export function DiscoverPage() {
  const { profiles, loading } = useSocialRegistry();
  const currentProfileId = useCurrentProfileId();
  const openConversation = useOpenConversation();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [storyProfileId, setStoryProfileId] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<{ profileId: string; postId: string } | null>(null);

  const discoverable = useMemo(() => profiles.filter((profile) => profile.discoverable), [profiles]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return discoverable.filter((profile) => {
      if (filter === 'online' && profile.presence !== 'online') return false;
      if (filter === 'stories' && !profile.stories.some((story) => story.status === 'active')) return false;
      if (!needle) return true;
      return (
        profile.displayName.toLowerCase().includes(needle) ||
        profile.handle.toLowerCase().includes(needle) ||
        profile.interests.some((interest) => interest.toLowerCase().includes(needle))
      );
    });
  }, [discoverable, filter, query]);

  const storyProfiles = discoverable.filter((profile) => profile.stories.some((story) => story.status === 'active'));

  const feed = useMemo(
    () =>
      discoverable
        .flatMap((profile) => profile.posts.map((post) => ({ profile, post })))
        .sort((a, b) => b.post.createdAt.localeCompare(a.post.createdAt)),
    [discoverable],
  );

  const storyProfile = storyProfileId ? profiles.find((profile) => profile.id === storyProfileId) ?? null : null;

  const activePost = useMemo(() => {
    if (!openPost) return null;
    const owner = profiles.find((profile) => profile.id === openPost.profileId);
    const post = owner?.posts.find((item) => item.id === openPost.postId);
    return owner && post ? { owner, post } : null;
  }, [openPost, profiles]);

  return (
    <>
      <AppHeader
        title="Aura"
        subtitle="Premium social AI companion network."
        actions={
          <Link className="aa-btn is-sm is-ghost" to="/app/me">
            You
          </Link>
        }
      />
      <div className="aa-main">
        <section className="aa-discover-hero">
          <div className="aa-hero-copy">
            <span className="aa-kicker">
              <Sparkles size={14} /> Live right now
            </span>
            <h2>Find the people and companions worth talking to.</h2>
          </div>
          <div className="aa-hero-stats" aria-label="Aura network stats">
            <span>
              <b>{discoverable.length}</b>
              Profiles
            </span>
            <span>
              <b>{storyProfiles.length}</b>
              Stories
            </span>
            <span>
              <b>{feed.length}</b>
              Posts
            </span>
          </div>
        </section>

        <div className="aa-search-wrap">
          <Search size={17} aria-hidden="true" />
          <input
            className="aa-input aa-search-input"
            placeholder="Search people, interests, vibes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search Aura"
          />
        </div>
        <div className="aa-chips">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`aa-chip${filter === item.id ? ' is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section>
          <h2 className="aa-section-title" style={{ padding: '0 16px' }}>
            Stories
          </h2>
          {storyProfiles.length === 0 ? (
            <p className="aa-empty" style={{ margin: '0 16px' }}>
              No active stories right now.
            </p>
          ) : (
            <div className="aa-rail">
              {storyProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="aa-rail-item"
                  onClick={() => setStoryProfileId(profile.id)}
                >
                  <span className="aa-rail-ring">
                    <Avatar profile={profile} />
                  </span>
                  <span className="aa-rail-name">
                    {profile.id === currentProfileId ? 'Your story' : profile.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="aa-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <h2 className="aa-section-title" style={{ padding: '0 16px' }}>
            <span>People</span>
            <span style={{ letterSpacing: 0 }}>{visible.length}</span>
          </h2>
          {visible.length === 0 ? (
            <p className="aa-empty" style={{ margin: '0 16px' }}>
              {loading ? 'Loading people…' : 'Nobody matches that search.'}
            </p>
          ) : (
            <div className="aa-people">
              {visible.map((profile) => (
                <PersonCard
                  key={profile.id}
                  profile={profile}
                  isSelf={profile.id === currentProfileId}
                  onOpen={() => openConversation(profile)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="aa-section-title" style={{ padding: '0 16px' }}>
            Latest posts
          </h2>
          {feed.length === 0 ? (
            <p className="aa-empty" style={{ margin: '0 16px 16px' }}>
              No posts yet.
            </p>
          ) : (
            feed.map(({ profile, post }) => (
              <article key={post.id} className="aa-post">
                <div className="aa-post-head">
                  <Avatar profile={profile} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Link className="aa-link aa-person-name" to={`/app/u/${profile.id}`}>
                        {profile.displayName}
                      </Link>
                    </div>
                    <div className="aa-person-handle">
                      {profile.handle} · {post.createdAt}
                    </div>
                  </div>
                </div>
                <div className="aa-post-media">{post.mediaLabel}</div>
                <p className="aa-post-caption">{post.caption}</p>
                <div className="aa-post-actions" aria-label="Post actions">
                  <button type="button" aria-label="Like post">
                    <Heart size={21} />
                  </button>
                  <button
                    type="button"
                    aria-label="Open comments"
                    onClick={() => setOpenPost({ profileId: profile.id, postId: post.id })}
                  >
                    <MessageCircle size={21} />
                  </button>
                </div>
                <div className="aa-post-meta">
                  <span>{post.likes} likes</span>
                  <span>{post.comments} comments</span>
                  <button
                    type="button"
                    className="aa-link"
                    onClick={() => setOpenPost({ profileId: profile.id, postId: post.id })}
                  >
                    Open post
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
      {storyProfile ? <StoryViewer profile={storyProfile} onClose={() => setStoryProfileId(null)} /> : null}
      {activePost ? (
        <PostViewer profile={activePost.owner} post={activePost.post} onClose={() => setOpenPost(null)} />
      ) : null}
    </>
  );
}

function PersonCard({
  profile,
  isSelf,
  onOpen,
}: {
  profile: SocialProfile;
  isSelf: boolean;
  onOpen: () => void;
}) {
  const { can } = useCompanionRegistry();
  const canMessage = can(profile.id, 'message');
  const canFollow = can(profile.id, 'follow');

  return (
    <article className="aa-person">
      <div className="aa-person-avatar-row">
        <Avatar profile={profile} />
      </div>
      <div>
        <Link className="aa-link aa-person-name" to={`/app/u/${profile.id}`}>
          {profile.displayName}
        </Link>
        <div className="aa-person-handle">{profile.handle}</div>
      </div>
      <div className="aa-person-line">{profile.headline}</div>
      <div className="aa-person-handle">{PRESENCE_TEXT[profile.presence]}</div>
      <div className="aa-person-actions">
        <button type="button" className="aa-btn is-sm is-primary" onClick={onOpen} disabled={!canMessage}>
          Message
        </button>
        {!isSelf && canFollow ? <FollowButton profile={profile} /> : null}
      </div>
    </article>
  );
}
