import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationMenu } from '../../app/components/NotificationMenu';

export function StudioTopbar() {
  const navigate = useNavigate();
  return (
    <header className="s-topbar">
      <div className="s-search">
        <Search size={17} />
        <input placeholder="Search companions, users, requests…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="s-topbar-spacer" />

      <button className="s-btn s-btn-ghost s-btn-sm" onClick={() => navigate('/studio/create')}>
        <Plus size={16} />
        New
      </button>

      <NotificationMenu triggerClassName="s-iconbtn" />

      <button className="s-avatar-chip">
        <span className="s-av">AU</span>
        <span>
          <b>Admin</b>
          <small>Owner</small>
        </span>
      </button>
    </header>
  );
}
