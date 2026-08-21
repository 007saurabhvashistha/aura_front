import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useNotifications } from '../data/useNotifications';

const NAV = [
  { to: '/app', icon: '◎', label: 'Discover', end: true },
  { to: '/app/chats', icon: '✉', label: 'Chats', end: false },
  { to: '/app/notifications', icon: '♡', label: 'Activity', end: false },
  { to: '/app/me', icon: '☺', label: 'Profile', end: false },
];

/** Immersive surfaces (chat thread, live call) take over the whole shell. */
function hidesNav(pathname: string): boolean {
  return /^\/app\/(chats\/[^/]+|calls\/[^/]+|settings)/.test(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { conversations } = useConversationRegistry();
  const { unread } = useNotifications();
  const live = conversations.filter((item) => item.status === 'live').length;

  const badgeFor = (label: string): number =>
    label === 'Chats' ? live : label === 'Activity' ? unread : 0;

  return (
    <div className="aura-app">
      <div className="aa-shell">
        {children}
        {hidesNav(pathname) ? null : (
          <nav className="aa-nav is-four">
            {NAV.map((item) => {
              const badge = badgeFor(item.label);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                >
                  <span className="aa-nav-icon" aria-hidden="true">
                    {item.icon}
                    {badge > 0 ? <span className="aa-nav-dot">{badge}</span> : null}
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

export function AppHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="aa-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {back}
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          {subtitle ? <p className="aa-topbar-sub">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="aa-topbar-actions">{actions}</div> : null}
    </header>
  );
}
