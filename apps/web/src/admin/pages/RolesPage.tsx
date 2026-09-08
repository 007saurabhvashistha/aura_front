import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Check, FileJson, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { ApiClientError } from '../../lib/api';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import {
  ROLE_PERMISSIONS,
  rolesApi,
  type AdminRole,
  type RoleInput,
  type RolePermission,
  type RolePolicy,
  type RoleStatus,
} from '../services/rolesApi';

const GROUPS = [
  ['Agents', /^(agents)\./],
  ['Knowledge & tools', /^(knowledge|tools)\./],
  ['Integrations', /^(integrations)\./],
  ['Conversations & people', /^(conversations|people)\./],
  ['Platform', /^(analytics|admin|billing|settings)\./],
] as const;

const EMPTY_ROLE: RoleInput = { key: '', name: '', description: '', status: 'draft', permissions: [] };
const EXAMPLE_POLICY: RolePolicy = {
  version: 1,
  roles: [{
    key: 'support_lead',
    name: 'Support Lead',
    description: 'Manages customer conversations and support operations.',
    status: 'active',
    permissions: ['conversations.read', 'conversations.manage', 'people.read', 'analytics.read'],
  }],
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
const messageOf = (error: unknown) => error instanceof ApiClientError ? error.message : 'Something went wrong. Please try again.';

function DialogFrame({ title, kicker, subtitle, onClose, children, footer, wide = false }: {
  title: string; kicker: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="rbac-overlay" role="presentation" onMouseDown={onClose}>
      <section className={`rbac-dialog${wide ? ' is-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="rbac-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="rbac-kicker">{kicker}</p><h2 id="rbac-dialog-title">{title}</h2><span>{subtitle}</span></div><button onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="rbac-dialog-body">{children}</div>
        <footer>{footer}</footer>
      </section>
    </div>
  );
}

function RoleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (role: AdminRole) => void }) {
  const [draft, setDraft] = useState<RoleInput>(EMPTY_ROLE);
  const [keyEdited, setKeyEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (permission: RolePermission) => setDraft((current) => ({
    ...current,
    permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission],
  }));

  const submit = async () => {
    if (!draft.name.trim() || !draft.key.trim()) return setError('Role name and key are required.');
    if (!draft.permissions.length) return setError('Select at least one permission.');
    setBusy(true); setError(null);
    try { onCreated(await rolesApi.create({ ...draft, name: draft.name.trim(), key: draft.key.trim(), description: draft.description.trim() })); onClose(); }
    catch (requestError) { setError(messageOf(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <DialogFrame title="Create a role" kicker="Access template" subtitle="Choose exactly what this role can see and change." onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => void submit()} disabled={busy}>{busy ? 'Creating...' : 'Create role'}</Button></>}>
      <div className="rbac-fields-two">
        <label><span>Role name</span><input value={draft.name} placeholder="Support Lead" onChange={(event) => { const name = event.target.value; setDraft((current) => ({ ...current, name, key: keyEdited ? current.key : slugify(name) })); }} /></label>
        <label><span>Role key</span><input value={draft.key} placeholder="support_lead" onChange={(event) => { setKeyEdited(true); setDraft((current) => ({ ...current, key: slugify(event.target.value) })); }} /></label>
      </div>
      <label><span>Description</span><textarea rows={3} value={draft.description} placeholder="Describe who should receive this role." onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
      <label><span>Starting status</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as RoleStatus }))}><option value="draft">Draft</option><option value="active">Active</option></select></label>
      <fieldset className="rbac-permissions"><legend>Permissions <b>{draft.permissions.length} selected</b></legend>{GROUPS.map(([label, pattern]) => <div key={label}><strong>{label}</strong><div>{ROLE_PERMISSIONS.filter((permission) => pattern.test(permission)).map((permission) => <label key={permission} className={draft.permissions.includes(permission) ? 'is-selected' : ''}><input type="checkbox" checked={draft.permissions.includes(permission)} onChange={() => toggle(permission)} /><span>{permission.split('.')[1]}</span></label>)}</div></div>)}</fieldset>
      {error && <p className="rbac-error" role="alert">{error}</p>}
    </DialogFrame>
  );
}

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (roles: AdminRole[]) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(EXAMPLE_POLICY, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => { try { const value = JSON.parse(raw) as RolePolicy; return value?.version === 1 && Array.isArray(value.roles) ? value : null; } catch { return null; } }, [raw]);

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 256_000) return setError('Policy file must be smaller than 256 KB.');
    setRaw(await file.text()); setError(null);
  };
  const submit = async () => {
    if (!parsed) return setError('Enter valid version 1 policy JSON with a roles array.');
    setBusy(true); setError(null);
    try { const result = await rolesApi.importPolicy(parsed); onImported(result.roles); onClose(); }
    catch (requestError) { setError(messageOf(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <DialogFrame wide title="Import role policy" kicker="JSON policy" subtitle="Existing role keys are updated; new keys are created." onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => void submit()} disabled={busy || !parsed}>{busy ? 'Importing...' : 'Import policy'}</Button></>}>
      <label className="rbac-file"><FileJson size={20} /><span><strong>Choose JSON file</strong><small>Maximum 256 KB</small></span><input type="file" accept="application/json,.json" onChange={(event) => void readFile(event)} /></label>
      <label><span>Policy JSON</span><textarea className="rbac-json" rows={14} value={raw} spellCheck={false} onChange={(event) => setRaw(event.target.value)} /></label>
      <div className={`rbac-preview ${parsed ? 'is-valid' : ''}`}>{parsed ? <><Check size={17} /><span><strong>Ready to import</strong>{parsed.roles.length} role{parsed.roles.length === 1 ? '' : 's'} detected</span></> : <><FileJson size={17} /><span><strong>Invalid policy</strong>Check the JSON structure and version.</span></>}</div>
      {error && <p className="rbac-error" role="alert">{error}</p>}
    </DialogFrame>
  );
}

export function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'create' | 'import' | null>(null);

  const load = async () => { setLoading(true); setError(null); try { setRoles(await rolesApi.list()); } catch (requestError) { setError(messageOf(requestError)); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const replace = (role: AdminRole) => setRoles((current) => current.map((item) => item.id === role.id ? role : item));
  const updateStatus = async (role: AdminRole, status: RoleStatus) => { try { replace(await rolesApi.update(role.id, { status })); setNotice(`${role.name} updated.`); } catch (requestError) { setError(messageOf(requestError)); } };
  const remove = async (role: AdminRole) => { if (!confirm(`Delete ${role.name}? This cannot be undone.`)) return; try { await rolesApi.delete(role.id); setRoles((current) => current.filter((item) => item.id !== role.id)); setNotice(`${role.name} deleted.`); } catch (requestError) { setError(messageOf(requestError)); } };
  const merge = (incoming: AdminRole[]) => setRoles((current) => { const map = new Map(current.map((role) => [role.key, role])); incoming.forEach((role) => map.set(role.key, role)); return [...map.values()].sort((a, b) => a.name.localeCompare(b.name)); });

  return (
    <div className="rbac-page">
      <PageHeader title="Roles & Permissions" description="Create auditable access templates for every Aura operations team." />
      <div className="rbac-actions"><div><span><ShieldCheck size={18} /></span><p><strong>Least privilege by default</strong><small>Every permission is explicit, reviewable, and server validated.</small></p></div><Button variant="secondary" onClick={() => setDialog('import')}><FileJson size={16} /> Import Policy</Button><Button variant="primary" onClick={() => setDialog('create')}><Plus size={16} /> Create Role</Button></div>
      {notice && <div className="rbac-notice is-success"><Check size={16} />{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={14} /></button></div>}
      {error && <div className="rbac-notice is-error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss"><X size={14} /></button></div>}
      <section className="rbac-summary"><article><span><KeyRound size={19} /></span><div><strong>{roles.length}</strong><small>Role templates</small></div></article><article><span><ShieldCheck size={19} /></span><div><strong>{roles.filter((role) => role.status === 'active').length}</strong><small>Active roles</small></div></article><article><span><LockKeyhole size={19} /></span><div><strong>{new Set(roles.flatMap((role) => role.permissions)).size}</strong><small>Permissions in use</small></div></article></section>
      {loading ? <div className="rbac-loading"><RefreshCw className="animate-spin" size={20} /> Loading access policy...</div> : roles.length === 0 && !error ? <div className="rbac-empty"><ShieldCheck size={28} /><h2>No roles yet</h2><p>Create your first role or import a versioned policy.</p><Button variant="primary" onClick={() => setDialog('create')}>Create role</Button></div> : <section className="rbac-role-grid">{roles.map((role) => <article className="rbac-role" key={role.id}><header><span className="rbac-role-icon"><KeyRound size={18} /></span><div><h2>{role.name}</h2><code>{role.key}</code></div><Badge variant={role.status === 'active' ? 'success' : role.status === 'deprecated' ? 'danger' : 'warning'}>{role.status}</Badge></header><p>{role.description || 'No description provided.'}</p><div className="rbac-role-permissions">{role.permissions.slice(0, 6).map((permission) => <span key={permission}>{permission}</span>)}{role.permissions.length > 6 && <span>+{role.permissions.length - 6} more</span>}</div><footer><span>{role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}{role.isSystem ? ' · System role' : ''}</span><div><select aria-label={`Status for ${role.name}`} value={role.status} onChange={(event) => void updateStatus(role, event.target.value as RoleStatus)}><option value="draft">Draft</option><option value="active">Active</option><option value="deprecated">Deprecated</option></select>{!role.isSystem && <button onClick={() => void remove(role)} aria-label={`Delete ${role.name}`} title="Delete role"><Trash2 size={16} /></button>}</div></footer></article>)}</section>}
      {dialog === 'create' && <RoleDialog onClose={() => setDialog(null)} onCreated={(role) => { merge([role]); setNotice(`${role.name} created.`); }} />}
      {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onImported={(imported) => { merge(imported); setNotice(`${imported.length} role${imported.length === 1 ? '' : 's'} imported.`); }} />}
    </div>
  );
}
