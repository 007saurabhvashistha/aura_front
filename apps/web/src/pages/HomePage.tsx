import { useEffect, useState } from 'react';
import { ArrowRight, LogOut, MessageCircle, Server, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { HealthStatus } from '@aura/shared';
import { useAuth } from '../auth/AuthContext';
import { fetchHealth } from '../lib/api';

export function HomePage() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetchHealth()
      .then((h) => active && setHealth(h))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const onboarding = profile?.onboarding;
  const displayName = profile?.profile.displayName || user?.name || 'there';

  return (
    <main className="legacy-page legacy-home">
      <div className="legacy-shell">
        <header className="legacy-topbar">
          <Link to="/app" className="legacy-brand">
            <span><Sparkles size={19} /></span><strong>Aura</strong>
          </Link>
          <nav className="legacy-topbar__actions">
            <Link to="/profile"><UserRound size={17} /> Profile</Link>
            <Link to="/app">Explore <ArrowRight size={16} /></Link>
          <button
            type="button"
              className="legacy-icon-button"
              aria-label="Log out"
              title="Log out"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
              <LogOut size={17} />
          </button>
          </nav>
        </header>

        <section className="legacy-home__hero">
          <div>
            <p className="legacy-eyebrow">Your private space</p>
            <h1>Good to see you,<br />{displayName}.</h1>
            <p>Meaningful conversations, familiar voices, and a social world shaped around you.</p>
          </div>
          <div className="legacy-home__signal" aria-label="Aura is ready">
            <span><Sparkles size={24} /></span>
            <div><strong>Aura is ready</strong><small>Your companion is available</small></div>
            <i />
          </div>
        </section>

        {onboarding && !onboarding.complete && (
          <section className="legacy-banner">
            <div><ShieldCheck size={19} /><p><strong>Complete your profile</strong><span>Unlock conversations and personalized recommendations.</span></p></div>
            <Link to="/onboarding">Finish setup <ArrowRight size={16} /></Link>
          </section>
        )}

        <section className="legacy-home__grid">
          <article className="legacy-card legacy-home__account">
            <div className="legacy-section-heading"><div><p className="legacy-eyebrow">Account overview</p><h2>Your space</h2></div><UserRound size={21} /></div>
            <dl>
              <div><dt>Email</dt><dd>{user?.email ?? '—'}</dd></div>
              <div><dt>Age verified</dt><dd>{profile?.profile.isAgeVerified ? 'Verified' : 'Pending'}</dd></div>
              <div><dt>Profile setup</dt><dd>{onboarding?.complete ? 'Complete' : 'In progress'}</dd></div>
              <div><dt>Service</dt><dd className={health ? 'is-online' : ''}><Server size={14} /> {health?.status ?? 'Checking'}</dd></div>
            </dl>
          </article>

          <article className="legacy-card legacy-home__conversation">
            <span className="legacy-feature-icon"><MessageCircle size={24} /></span>
            <p className="legacy-eyebrow">Voice companion</p>
            <h2>Talk through whatever is on your mind.</h2>
            <p>A private voice conversation that remembers context and meets you where you are.</p>
          <Link
            to="/conversation"
              className={`legacy-primary-link ${onboarding?.complete ? '' : 'is-disabled'}`.trim()}
            aria-disabled={!onboarding?.complete}
              onClick={(event) => {
              if (!onboarding?.complete) {
                  event.preventDefault();
              }
            }}
          >
              Start a conversation <ArrowRight size={17} />
          </Link>
          {!onboarding?.complete && (
              <small>Finish onboarding to unlock voice conversations.</small>
          )}
          </article>
        </section>
      </div>
    </main>
  );
}
