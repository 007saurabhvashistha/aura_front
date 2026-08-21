import { useSocialRegistry, type PresenceStatus, type SocialProfile } from '../../admin/hooks/useSocialRegistry';

/** The signed-in user's own profile id, resolved from the session. */
export function useCurrentProfileId(): string | null {
  return useSocialRegistry().currentProfileId;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// The consumer app presents one unified identity. EntityType stays in the
// domain model and is surfaced only in the admin control plane.
export function Avatar({
  profile,
  size = 'md',
}: {
  profile: Pick<SocialProfile, 'displayName' | 'presence'>;
  size?: 'md' | 'lg';
}) {
  return (
    <span className={`aa-avatar${size === 'lg' ? ' is-lg' : ''}`}>
      {initials(profile.displayName)}
      <span className={`aa-avatar-presence is-${profile.presence}`} aria-hidden="true" />
    </span>
  );
}

export const PRESENCE_TEXT: Record<PresenceStatus, string> = {
  online: 'Online now',
  away: 'Away',
  offline: 'Offline',
};

export function FollowButton({ profile, size = 'sm' }: { profile: SocialProfile; size?: 'sm' | 'md' }) {
  const { toggleFollow } = useSocialRegistry();
  const following = profile.followedByViewer;
  return (
    <button
      type="button"
      className={`aa-btn${size === 'sm' ? ' is-sm' : ''}${following ? '' : ' is-primary'}`}
      aria-pressed={following}
      onClick={() => toggleFollow(profile.id)}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

/** Registry stamps are "YYYY-MM-DD HH:mm". */
export function shortTime(stamp: string): string {
  return stamp.slice(11) || stamp;
}
