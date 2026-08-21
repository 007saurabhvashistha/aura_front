import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppShell';
import { Avatar } from '../components/identity';
import { useNotifications } from '../data/useNotifications';
import { useSocialRegistry } from '../../admin/hooks/useSocialRegistry';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function NotificationsPage() {
  const { items, loading, error, markAllRead, unread } = useNotifications();
  const { profiles } = useSocialRegistry();

  return (
    <>
      <AppHeader
        title="Activity"
        subtitle="What happened while you were away."
        back={
          <Link className="aa-back" to="/app" aria-label="Back">
            ←
          </Link>
        }
        actions={
          unread > 0 ? (
            <button type="button" className="aa-btn is-sm is-ghost" onClick={() => void markAllRead()}>
              Mark read
            </button>
          ) : undefined
        }
      />
      <div className="aa-main">
        {error && <p className="aa-notice">{error}</p>}
        {items.length === 0 ? (
          <p className="aa-empty" style={{ margin: '16px' }}>
            {loading ? 'Loading activity…' : 'Nothing yet. Follow a few people to get started.'}
          </p>
        ) : (
          <ul className="aa-notif-list">
            {items.map((item) => {
              const actor = item.actorProfileId
                ? profiles.find((profile) => profile.id === item.actorProfileId) ?? null
                : null;
              const body = (
                <>
                  <span className="aa-notif-body">{item.body}</span>
                  <span className="aa-notif-time">{relativeTime(item.createdAt)}</span>
                </>
              );

              return (
                <li key={item.id} className={`aa-notif${item.readAt ? '' : ' is-unread'}`}>
                  {actor ? (
                    <Link className="aa-notif-link" to={`/app/u/${actor.id}`}>
                      <Avatar profile={actor} />
                      {body}
                    </Link>
                  ) : (
                    <div className="aa-notif-link">
                      <span className="aa-avatar">A</span>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
