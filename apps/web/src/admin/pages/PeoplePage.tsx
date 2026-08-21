import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { EntityBadge } from '../components/EntityBadge';
import { presenceBadge } from '../components/statusMaps';
import { useSocialRegistry } from '../hooks/useSocialRegistry';
import { useConversationRegistry } from '../hooks/useConversationRegistry';
import { useCompanionRegistry } from '../hooks/useCompanionRegistry';

const TYPE_FILTERS = [
  { label: 'Everyone', value: 'all' },
  { label: 'AI characters', value: 'AI' },
  { label: 'Real people', value: 'REAL_PERSON' },
];

// Discovery surface. AI characters and real people share one directory, but the
// entity badge is mandatory on every card so AI is never mistaken for a human.
export function PeoplePage() {
  const navigate = useNavigate();
  const { profiles, mode, dataError } = useSocialRegistry();
  const { startConversation } = useConversationRegistry();
  const { can, channelAvailable } = useCompanionRegistry();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [discoverableOnly, setDiscoverableOnly] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesSearch =
        !query ||
        profile.displayName.toLowerCase().includes(query) ||
        profile.handle.toLowerCase().includes(query) ||
        profile.interests.some((interest) => interest.toLowerCase().includes(query));
      const matchesType = typeFilter === 'all' || profile.type === typeFilter;
      const matchesDiscovery = !discoverableOnly || profile.discoverable;
      return matchesSearch && matchesType && matchesDiscovery;
    });
  }, [profiles, search, typeFilter, discoverableOnly]);

  const startAndOpen = async (profileId: string, channel: 'chat' | 'video') => {
    if (!channelAvailable(profileId, channel)) return;
    const created = await startConversation({ profileId, channel, topic: channel === 'video' ? 'Video call' : 'New message' });
    if (created) navigate(`/admin/conversations/${created.id}${channel === 'video' ? '/calls' : ''}`);
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="People"
        description="Discovery directory for AI characters and real people. Entity type is always labelled."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'People' }]}
        actions={[{ label: 'Conversations', variant: 'secondary', href: '/admin/conversations' }]}
      />

      <DemoNotice
        message={
          mode === 'REAL'
            ? `REAL: Profiles, follows, posts, and stories are persisted through /api/v1/social.${
                dataError ? ` Last error: ${dataError}` : ''
              }`
            : 'DEMO / SIMULATED: Profiles, stories, and posts are in-memory demo state. AI characters cannot publish stories or posts by design.'
        }
      />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search people and AI characters"
        filters={TYPE_FILTERS}
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
        actions={
          <button
            type="button"
            className={`admin-filter-chip ${discoverableOnly ? 'is-active' : ''}`}
            onClick={() => setDiscoverableOnly((value) => !value)}
          >
            Discoverable only
          </button>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState title="No profiles found" description="Try a different search term or filter." />
      ) : (
        <div className="se-people-grid">
          {filtered.map((profile) => {
            const presence = presenceBadge(profile.presence);
            const isAi = profile.type === 'AI';
            return (
              <article key={profile.id} className={`se-profile-card is-${profile.type.toLowerCase()}`}>
                <header className="se-profile-card-head">
                  <div className="se-avatar" aria-hidden="true">
                    {profile.displayName.charAt(0)}
                  </div>
                  <div className="se-profile-card-identity">
                    <div className="se-identity">
                      <button
                        type="button"
                        className="admin-link-cell"
                        onClick={() => navigate(`/admin/people/${profile.id}`)}
                      >
                        {profile.displayName}
                      </button>
                      <EntityBadge type={profile.type} compact />
                    </div>
                    <p className="admin-cell-sub">{profile.handle} · {profile.headline}</p>
                  </div>
                  <Badge variant={presence.variant}>{presence.label}</Badge>
                </header>

                <p className="se-profile-bio">{profile.bio}</p>

                <ul className="se-chip-list">
                  {profile.interests.map((interest) => (
                    <li key={interest} className="se-chip">{interest}</li>
                  ))}
                </ul>

                <dl className="se-profile-meta">
                  <div>
                    <dt>Followers</dt>
                    <dd>{profile.followers}</dd>
                  </div>
                  <div>
                    <dt>{isAi ? 'Linked agent' : 'Stories'}</dt>
                    <dd>{isAi ? profile.agentId ?? 'None' : profile.stories.filter((s) => s.status === 'active').length}</dd>
                  </div>
                  <div>
                    <dt>{isAi ? 'Discovery' : 'Posts'}</dt>
                    <dd>{isAi ? (profile.discoverable ? 'Visible' : 'Hidden') : profile.posts.length}</dd>
                  </div>
                </dl>

                <footer className="se-profile-card-actions">
                  <Button variant="primary" size="sm" onClick={() => startAndOpen(profile.id, 'chat')} disabled={!can(profile.id, 'message')}>
                    {isAi ? 'Chat' : 'Message'}
                  </Button>
                  {isAi ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/admin/test?agent=${profile.agentId ?? ''}`)}
                      disabled={!profile.agentId}
                    >
                      Voice test
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => startAndOpen(profile.id, 'video')} disabled={!channelAvailable(profile.id, 'video')}>
                      Video call
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/people/${profile.id}`)}>
                    Profile
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
