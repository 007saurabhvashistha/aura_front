import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, MessageCircle, Sparkles, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '../data/consumerApi';
import { useNotifications } from '../data/useNotifications';

function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return 'Now';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function destinationFor(item: NotificationItem): string {
  if (item.type === 'message' && item.entityId) return `/app/chats/${item.entityId}`;
  if (item.actorProfileId) return `/app/u/${item.actorProfileId}`;
  return '/app/notifications';
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'message') return <MessageCircle size={16} />;
  if (type === 'follow') return <UserPlus size={16} />;
  return <Sparkles size={16} />;
}

export function NotificationMenu({ triggerClassName }: { triggerClassName?: string }) {
  const navigate = useNavigate();
  const { items, unread, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const openItem = async (item: NotificationItem) => {
    await markRead(item.id);
    setOpen(false);
    navigate(destinationFor(item));
  };

  return (
    <div className="notification-menu" ref={rootRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void refresh();
        }}
      >
        <Bell size={18} />
        {unread > 0 ? <span className="notification-menu__badge">{unread > 99 ? '99+' : unread}</span> : null}
      </button>

      {open ? (
        <section className="notification-menu__popover" role="dialog" aria-label="Notifications">
          <header>
            <div><strong>Notifications</strong><span>{unread > 0 ? `${unread} unread` : 'You are all caught up'}</span></div>
            {unread > 0 ? (
              <button type="button" onClick={() => void markAllRead()}><CheckCheck size={15} /> Mark all read</button>
            ) : null}
          </header>

          <div className="notification-menu__list">
            {loading && items.length === 0 ? <p className="notification-menu__state">Loading notifications...</p> : null}
            {error && items.length === 0 ? (
              <button className="notification-menu__state is-error" type="button" onClick={() => void refresh()}>
                Could not load notifications. Try again.
              </button>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <div className="notification-menu__empty"><span><Bell size={20} /></span><strong>Nothing new</strong><p>Updates from your Aura network will appear here.</p></div>
            ) : null}
            {items.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-menu__item${item.readAt ? '' : ' is-unread'}`}
                onClick={() => void openItem(item)}
              >
                <span className="notification-menu__icon"><NotificationIcon type={item.type} /></span>
                <span className="notification-menu__body"><strong>{item.actorName ?? 'Aura'}</strong><span>{item.body}</span></span>
                <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
              </button>
            ))}
          </div>

          <button className="notification-menu__all" type="button" onClick={() => { setOpen(false); navigate('/app/notifications'); }}>
            View all activity
          </button>
        </section>
      ) : null}
    </div>
  );
}