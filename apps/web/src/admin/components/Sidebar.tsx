import { Link, useLocation } from 'react-router-dom';

interface SidebarLink {
  label: string;
  href: string;
}

interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

const NAV_SECTIONS: SidebarSection[] = [
  {
    title: 'Workspace',
    links: [
      { label: 'Control Center', href: '/admin' },
      { label: 'Activity', href: '/admin/activity' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Agents', href: '/admin/agents' },
      { label: 'Knowledge', href: '/admin/knowledge' },
      { label: 'Tools', href: '/admin/tools' },
      { label: 'Integrations', href: '/admin/integrations' },
    ],
  },
  {
    title: 'Operate',
    links: [
      { label: 'Conversations', href: '/admin/conversations' },
      { label: 'Test Center', href: '/admin/test' },
    ],
  },
  {
    title: 'Analyze',
    links: [
      { label: 'Analytics', href: '/admin/analytics' },
      { label: 'Usage', href: '/admin/settings/billing' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { label: 'Team', href: '/admin/team' },
      { label: 'Roles & Permissions', href: '/admin/users/roles' },
      { label: 'Settings', href: '/admin/settings' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  collapsed: boolean;
  isDesktop: boolean;
  onNavigate?: () => void;
  onToggleCollapse: () => void;
}

function NavIcon({ label }: { label: string }) {
  const icons: Record<string, React.ReactNode> = {
    'Control Center': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16v12H4zM9 12h6M12 9v6" />
      </svg>
    ),
    Activity: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13h4l2-6 4 10 2-4h4" />
      </svg>
    ),
    Overview: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-3m2 3l-2 3m2-3v6m9-11l2-3m2 3l-2 3m2-3v6M3 20h18M3 4h18v12a3 3 0 01-3 3H6a3 3 0 01-3-3V4z" />
      </svg>
    ),
    Agents: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    Dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-3m2 3l-2 3m2-3v6m9-11l2-3m2 3l-2 3m2-3v6M3 20h18M3 4h18v12a3 3 0 01-3 3H6a3 3 0 01-3-3V4z" />
      </svg>
    ),
    Users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 12H9m4 5H9m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'All Agents': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    'Create Agent': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
    Knowledge: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.483 9.246 5 7.5 5A4.5 4.5 0 003 9.5v9a4.5 4.5 0 014.5-4.5c1.746 0 3.332.483 4.5 1.253m0-9C13.168 5.483 14.754 5 16.5 5A4.5 4.5 0 0121 9.5v9a4.5 4.5 0 00-4.5-4.5c-1.746 0-3.332.483-4.5 1.253" />
      </svg>
    ),
    Integrations: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h8m-8 0l2.5-2.5M8 12l2.5 2.5m5.5-8v11a3 3 0 01-3 3H8a3 3 0 01-3-3v-11a3 3 0 013-3h5a3 3 0 013 3z" />
      </svg>
    ),
    Tools: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a4 4 0 00-5.4 5.8L3 18.4V21h2.6l6.3-6.3a4 4 0 005.8-5.4l-2.1 2.1-2.9-2.9 2-2.2z" />
      </svg>
    ),
    'Live Conversations': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 8v8m4-6v4m4-2a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    ),
    History: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'Conversation History': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'Test Center': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3h6M10 3v3l-5 7a4 4 0 003.2 6h7.6a4 4 0 003.2-6l-5-7V3" />
      </svg>
    ),
    Conversations: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    Settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    Usage: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M8 15l3-4 3 3 4-6" />
      </svg>
    ),
    Team: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-1a4 4 0 00-4-4h-1m-4 5H2v-1a4 4 0 014-4h4a4 4 0 014 4v1zm-6-9a3 3 0 100-6 3 3 0 000 6zm9 0a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    ),
    'Roles & Permissions': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5 2a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    ),
    'Workspace Settings': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
    Roles: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5 2a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    ),
    Permissions: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
      </svg>
    ),
    Analytics: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    Workspace: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
    Billing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M8 13h3" />
      </svg>
    ),
    Security: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    System: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v5H4V4zm0 11h16v5H4v-5zm6-6h4v6h-4V9z" />
      </svg>
    ),
    'System Logs': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };
  return icons[label] || null;
}

export function Sidebar({
  isOpen,
  collapsed,
  isDesktop,
  onNavigate,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();

  const sidebarWidth = isDesktop ? (collapsed ? 80 : 288) : 288;
  const sidebarTransform = isDesktop || isOpen ? 'translateX(0)' : 'translateX(-100%)';

  return (
    <nav
      className="admin-sidebar"
      style={{ width: `${sidebarWidth}px`, transform: sidebarTransform }}
    >
      <div className="admin-sidebar-header">
        <div className={`admin-sidebar-brand-row ${collapsed && isDesktop ? 'is-collapsed' : ''}`}>
          <div className="admin-sidebar-brand">
            <p className="admin-sidebar-brand-kicker">Aura</p>
            {(!collapsed || !isDesktop) && <p className="admin-sidebar-brand-title">Control Center</p>}
          </div>
          {isDesktop && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="admin-icon-button"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="admin-sidebar-workspace-wrap">
            <button type="button" className="admin-workspace-switcher">
              <div>
                <p className="admin-sidebar-workspace-kicker">Workspace</p>
                <p className="admin-sidebar-workspace-title">Aura Production</p>
              </div>
              <span className="admin-sidebar-workspace-action">Change</span>
            </button>
          </div>
        )}
      </div>

      <div className="admin-sidebar-sections">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="admin-sidebar-section">
            {!collapsed && (
              <p className="admin-sidebar-section-title">
                {section.title}
              </p>
            )}
            <ul className="admin-sidebar-links">
              {section.links.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/admin' && location.pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      title={collapsed && isDesktop ? item.label : undefined}
                      className={`admin-sidebar-link ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="admin-sidebar-accent" aria-hidden="true" />
                      <span className="admin-sidebar-icon" aria-hidden="true">
                        <NavIcon label={item.label} />
                      </span>
                      {(!collapsed || !isDesktop) && <span className="admin-sidebar-label">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="admin-sidebar-footer">
        <div className={`admin-sidebar-profile ${collapsed && isDesktop ? 'is-collapsed' : ''}`}>
          <p className="admin-sidebar-profile-name">Aman Ops</p>
          {(!collapsed || !isDesktop) && (
            <>
              <p className="admin-sidebar-profile-role">Workspace Admin</p>
              <p className="admin-sidebar-profile-meta">v0.1.0 • Production</p>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
