import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeSidebarOnMobile = () => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setSidebarCollapsed((prev) => !prev);
      return;
    }
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="admin-layout-root">
      {!isDesktop && sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebarOnMobile}
          className="admin-sidebar-backdrop"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        isDesktop={isDesktop}
        onNavigate={closeSidebarOnMobile}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div
        className="admin-layout-main"
        style={{ paddingLeft: isDesktop ? `${sidebarCollapsed ? 80 : 288}px` : '0' }}
      >
        <Topbar onSidebarToggle={handleSidebarToggle} />
        <main className="admin-layout-content">
          <div className="admin-layout-content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
