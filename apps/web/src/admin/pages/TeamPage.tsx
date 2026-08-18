import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionToolbar } from '../components/SectionToolbar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { DemoNotice } from '../components/DemoNotice';
import { Drawer } from '../components/Drawer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type MemberRole = 'owner' | 'admin' | 'operator' | 'viewer';
type MemberStatus = 'active' | 'invited';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  lastActive: string;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
};

const INITIAL_MEMBERS: TeamMember[] = [
  { id: 'mem-1', name: 'Aman Ops', email: 'aman@aura.ai', role: 'owner', status: 'active', lastActive: 'Just now' },
  { id: 'mem-2', name: 'Priya Sharma', email: 'priya@aura.ai', role: 'admin', status: 'active', lastActive: '2 hours ago' },
  { id: 'mem-3', name: 'Support Desk', email: 'support@aura.ai', role: 'operator', status: 'active', lastActive: 'Yesterday' },
  { id: 'mem-4', name: 'New Analyst', email: 'analyst@aura.ai', role: 'viewer', status: 'invited', lastActive: 'Pending' },
];

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Invited', value: 'invited' },
];

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('operator');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      const matchesSearch =
        !query || member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
      const matchesFilter = filter === 'all' || member.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [members, search, filter]);

  const handleInvite = () => {
    if (!email.trim()) return;
    setMembers((prev) => [
      {
        id: `mem-${Date.now().toString(36)}`,
        name: email.split('@')[0],
        email: email.trim(),
        role,
        status: 'invited',
        lastActive: 'Pending',
      },
      ...prev,
    ]);
    setEmail('');
    setRole('operator');
    setDrawerOpen(false);
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Team"
        description="Manage workspace members, invitations, and role assignments."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Team' }]}
        actions={[{ label: '+ Invite Member', variant: 'primary', onClick: () => setDrawerOpen(true) }]}
      />

      <DemoNotice message="Workspace administration foundation. Members and invitations are demo data until the backend is connected." />

      <SectionToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search members"
        filters={FILTERS}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Try a different search term or invite a new member."
          action={
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Invite Member
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <p className="admin-cell-title">{member.name}</p>
                    <p className="admin-cell-sub">{member.email}</p>
                  </td>
                  <td>{ROLE_LABELS[member.role]}</td>
                  <td>
                    <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                      {member.status === 'active' ? 'Active' : 'Invited'}
                    </Badge>
                  </td>
                  <td className="admin-cell-sub">{member.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Invite Member"
        description="Send a workspace invitation and assign a starting role."
        footer={
          <div className="admin-drawer-actions">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInvite} disabled={!email.trim()}>
              Send Invite
            </Button>
          </div>
        }
      >
        <div className="admin-form">
          <Input
            label="Email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="admin-field">
            <span className="admin-field-label">Role</span>
            <select className="admin-select" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        </div>
      </Drawer>
    </div>
  );
}
