import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from './Button';

interface TopbarProps {
  onSidebarToggle: () => void;
}

export function Topbar({ onSidebarToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const segments = location.pathname.split('/').filter(Boolean);
  const adminSegments = segments[0] === 'admin' ? segments.slice(1) : segments;
  const groupLabel =
    adminSegments[0] === 'agents'
      ? 'Agents'
      : adminSegments[0] === 'integrations'
        ? 'Integrations'
        : adminSegments[0] === 'conversations'
          ? 'Conversations'
          : 'Overview';
  const routeLabel = adminSegments.length === 0
    ? 'Dashboard'
    : adminSegments
        .map((part) => part.replace(/-/g, ' '))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' / ');

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <div className="admin-topbar-left">
          <button
            onClick={onSidebarToggle}
            className="admin-icon-button"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="admin-topbar-title-wrap">
            <p className="admin-topbar-crumbs">{groupLabel} / {routeLabel}</p>
            <h2 className="admin-topbar-title">{routeLabel}</h2>
          </div>
        </div>

        <div className="admin-topbar-search">
          <svg className="admin-topbar-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            aria-label="Search"
            placeholder="Search modules, agents, integrations"
            className="admin-topbar-search-input"
          />
          <span className="admin-topbar-search-hint">Ctrl+K</span>
        </div>

        <div className="admin-topbar-actions">
          <Link to="/admin/agents/create" className="btn btn-secondary admin-topbar-new-agent">
            New Agent
          </Link>

          <button type="button" className="admin-icon-button" title="Help">
            ?
          </button>

          <button type="button" className="admin-icon-button" title="Notifications">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
            </svg>
          </button>

          <div className="admin-topbar-divider" />

          <div className="admin-topbar-user-meta">
            <p className="admin-topbar-user-name">
              {user?.email?.split('@')[0] || 'Admin'}
            </p>
            <p className="admin-topbar-user-role">Administrator</p>
          </div>

          <div className="admin-topbar-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="admin-topbar-logout">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
