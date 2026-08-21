import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppShell';
import { useCurrentProfileId } from '../components/identity';
import { consumerApi, type BlockedProfile } from '../data/consumerApi';
import { useAuth } from '../../auth/AuthContext';
import { useSocialRegistry } from '../../admin/hooks/useSocialRegistry';
import type { PresenceStatus } from '../../admin/hooks/useSocialRegistry';

const PRESENCE_OPTIONS: Array<{ value: PresenceStatus; label: string }> = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Appear offline' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profiles, setPresence, setDiscoverable } = useSocialRegistry();
  const currentProfileId = useCurrentProfileId();
  const me = profiles.find((profile) => profile.id === currentProfileId) ?? null;

  const [blocked, setBlocked] = useState<BlockedProfile[]>([]);
  const [blockedError, setBlockedError] = useState<string | null>(null);

  const loadBlocked = useCallback(async (): Promise<void> => {
    try {
      setBlocked(await consumerApi.blocked());
      setBlockedError(null);
    } catch {
      setBlockedError('Your blocked list is unavailable right now.');
    }
  }, []);

  useEffect(() => {
    void loadBlocked();
  }, [loadBlocked]);

  async function unblock(profileId: string): Promise<void> {
    setBlocked((prev) => prev.filter((item) => item.id !== profileId));
    try {
      await consumerApi.unblock(profileId);
    } catch {
      void loadBlocked();
    }
  }

  return (
    <>
      <AppHeader
        title="Settings"
        subtitle="Privacy, safety and your account."
        back={
          <Link className="aa-back" to="/app/me" aria-label="Back">
            ←
          </Link>
        }
      />
      <div className="aa-main">
        <section className="aa-section">
          <h2 className="aa-section-title">Privacy</h2>
          <div className="aa-setting">
            <div>
              <strong>Show me in Discover</strong>
              <p className="aa-setting-note">When off, people can only reach you through a direct link.</p>
            </div>
            <label className="aa-switch">
              <input
                type="checkbox"
                checked={me?.discoverable ?? false}
                disabled={!me}
                onChange={(event) => me && setDiscoverable(me.id, event.target.checked)}
              />
              <span />
            </label>
          </div>

          <div className="aa-setting">
            <div>
              <strong>Presence</strong>
              <p className="aa-setting-note">Controls the dot other people see on your avatar.</p>
            </div>
            <select
              className="aa-select is-inline"
              value={me?.presence ?? 'offline'}
              disabled={!me}
              onChange={(event) => me && setPresence(me.id, event.target.value as PresenceStatus)}
            >
              {PRESENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="aa-section">
          <h2 className="aa-section-title">Blocked accounts</h2>
          {blockedError && <p className="aa-notice">{blockedError}</p>}
          {blocked.length === 0 ? (
            <p className="aa-empty">You have not blocked anyone.</p>
          ) : (
            <ul className="aa-blocked-list">
              {blocked.map((item) => (
                <li key={item.id} className="aa-blocked">
                  <div>
                    <strong>{item.displayName}</strong>
                    <span className="aa-setting-note">@{item.handle}</span>
                  </div>
                  <button type="button" className="aa-btn is-sm" onClick={() => void unblock(item.id)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="aa-section">
          <h2 className="aa-section-title">About Aura</h2>
          <p className="aa-setting-note" style={{ padding: '0 16px' }}>
            Aura hosts both people and AI companions. Companion accounts are labelled on their profile, never claim to
            be human, and cannot post, share stories or join calls.
          </p>
        </section>

        <section className="aa-section">
          <h2 className="aa-section-title">Account</h2>
          <div className="aa-setting">
            <div>
              <strong>Signed in</strong>
              <p className="aa-setting-note">{user?.email ?? '—'}</p>
            </div>
            <button
              type="button"
              className="aa-btn is-sm is-danger"
              onClick={() => {
                void logout().then(() => navigate('/login', { replace: true }));
              }}
            >
              Log out
            </button>
          </div>
          <div className="aa-setting">
            <div>
              <strong>Edit your details</strong>
              <p className="aa-setting-note">Name, languages and interests.</p>
            </div>
            <Link className="aa-btn is-sm" to="/profile">
              Open
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
