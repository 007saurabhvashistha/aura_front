import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiClientError } from '../lib/api';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, name.trim());
      // New accounts always need onboarding.
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="aura-login aura-signup">
      <div className="aura-login__frame aura-signup__frame">
        <section className="aura-login__story aura-signup__story" aria-label="Join Aura">
          <div className="aura-login__brand">
            <span className="aura-login__brand-mark" aria-hidden="true">
              <Sparkles size={21} strokeWidth={2.2} />
            </span>
            <span>Aura</span>
          </div>

          <div className="aura-login__story-copy aura-signup__story-copy">
            <p className="aura-login__eyebrow">A more meaningful social space</p>
            <h1>Make room for<br />real connection.</h1>
            <p className="aura-login__lead">
              Join a calmer network shaped around thoughtful conversations, shared moments, and people worth knowing.
            </p>
          </div>

          <div className="aura-signup__benefits">
            <div>
              <span><HeartHandshake size={17} /></span>
              <p><strong>Human-first</strong><small>Designed for genuine conversations</small></p>
            </div>
            <div>
              <span><ShieldCheck size={17} /></span>
              <p><strong>Private by design</strong><small>Your space stays yours</small></p>
            </div>
          </div>

          <div className="aura-signup__note">
            <div className="aura-login__avatar-stack" aria-hidden="true">
              <span>AK</span><span>MS</span><span>JR</span>
            </div>
            <p><strong>Find your people</strong><small>A warm community is waiting.</small></p>
          </div>
        </section>

        <section className="aura-login__access aura-signup__access">
          <div className="aura-login__form-wrap aura-signup__form-wrap">
            <div className="aura-login__mobile-brand">
              <span className="aura-login__brand-mark" aria-hidden="true"><Sparkles size={19} /></span>
              Aura
            </div>
            <p className="aura-login__kicker">Start your story</p>
            <h2>Create your account</h2>
            <p className="aura-login__subcopy">It only takes a moment to make Aura yours.</p>

            <form className="aura-login__form aura-signup__form" onSubmit={onSubmit}>
              <label htmlFor="signup-name">Your name</label>
              <div className="aura-login__field">
                <UserRound size={18} aria-hidden="true" />
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How should we call you?"
                  required
                  maxLength={120}
                  autoComplete="name"
                  disabled={busy}
                />
              </div>

              <label htmlFor="signup-email">Email address</label>
              <div className="aura-login__field">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={busy}
                />
              </div>

              <div className="aura-login__label-row">
                <label htmlFor="signup-password">Create a password</label>
                <span>8+ characters</span>
              </div>
              <div className="aura-login__field">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a secure password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={busy}
                />
                <button
                  className="aura-login__reveal"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                  title={showPassword ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label htmlFor="signup-confirm">Confirm password</label>
              <div className={`aura-login__field${confirmPassword && password === confirmPassword ? ' is-valid' : ''}`}>
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Type it once more"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={busy}
                />
                {confirmPassword && password === confirmPassword ? <Check className="aura-signup__valid" size={18} /> : null}
              </div>

              {error && <p className="aura-login__error" role="alert">{error}</p>}
              <button className="aura-login__submit" type="submit" disabled={busy}>
                <span>{busy ? 'Creating your space...' : 'Create my account'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>

            <p className="aura-login__signup">
              Already part of Aura? <Link to="/login">Sign in</Link>
            </p>
            <p className="aura-login__legal">By creating an account, you agree to a respectful and safe community.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
