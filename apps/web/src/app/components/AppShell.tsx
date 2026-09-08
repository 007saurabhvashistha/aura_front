import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, Compass, LogOut, MessageCircle, Settings, Sparkles, UserRound } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useAuth } from '../../auth/AuthContext';
import { useNotifications } from '../data/useNotifications';

const NAV: { to: string; Icon: LucideIcon; label: string; end: boolean }[] = [
  { to: '/app', Icon: Compass, label: 'Discover', end: true },
  { to: '/app/chats', Icon: MessageCircle, label: 'Chats', end: false },
  { to: '/app/notifications', Icon: Bell, label: 'Activity', end: false },
  { to: '/app/me', Icon: UserRound, label: 'Profile', end: false },
];

/** Immersive surfaces (chat thread, live call) take over the whole shell. */
function hidesNav(pathname: string): boolean {
  return /^\/app\/(chats\/[^/]+|calls\/[^/]+|settings)/.test(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { conversations } = useConversationRegistry();
  const { unread } = useNotifications();
  const live = conversations.filter((item) => item.status === 'live').length;
  const navHidden = hidesNav(pathname);

  const badgeFor = (label: string): number =>
    label === 'Chats' ? live : label === 'Activity' ? unread : 0;

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="aura-app">
      <div className="aa-shell">
        {navHidden ? null : (
          <aside className="aa-sidebar">
            <div className="aa-sidebar-brand">
              <span className="aa-sidebar-mark" aria-hidden="true"><Sparkles size={19} /></span>
              <div><strong>Aura</strong><small>Social space</small></div>
            </div>

            <nav className="aa-sidebar-nav" aria-label="Primary navigation">
              <p>Explore</p>
              {NAV.map((item) => {
                const badge = badgeFor(item.label);
                const { Icon } = item;
                return (
                  <NavLink key={item.to} to={item.to} end={item.end}>
                    <Icon size={19} strokeWidth={2} aria-hidden="true" />
                    <span>{item.label}</span>
                    {badge > 0 ? <b>{badge}</b> : null}
                  </NavLink>
                );
              })}
            </nav>

            <div className="aa-sidebar-footer">
              <NavLink className="aa-sidebar-settings" to="/app/settings">
                <Settings size={18} aria-hidden="true" />
                <span>Settings</span>
              </NavLink>
              <div className="aa-sidebar-account">
                <span className="aa-sidebar-avatar" aria-hidden="true">
                  {(profile?.profile.displayName || user?.email || 'A').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{profile?.profile.displayName || 'Your profile'}</strong>
                  <small>{user?.email}</small>
                </div>
                <button type="button" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </aside>
        )}
        <div className="aa-content">
          {children}
        </div>
        {navHidden ? null : (
          <nav className="aa-nav is-four">
            {NAV.map((item) => {
              const badge = badgeFor(item.label);
              const { Icon } = item;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                >
                  <span className="aa-nav-icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={2.2} />
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
