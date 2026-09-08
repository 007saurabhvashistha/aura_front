import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, HeartHandshake, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiClientError } from '../lib/api';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      const dest = (location.state as LocationState | null)?.from?.pathname ?? '/app';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="aura-login">
      <div className="aura-login__frame">
        <section className="aura-login__story" aria-label="About Aura">
          <div className="aura-login__brand">
            <span className="aura-login__brand-mark" aria-hidden="true">
              <Sparkles size={21} strokeWidth={2.2} />
            </span>
            <span>Aura</span>
          </div>

          <div className="aura-login__story-copy">
            <p className="aura-login__eyebrow">Your space. Your people.</p>
            <h1>Feel closer,<br />wherever you are.</h1>
            <p className="aura-login__lead">
              A private place for real conversations, shared moments, and companions who remember what matters.
            </p>
          </div>

          <div className="aura-login__preview" aria-hidden="true">
            <div className="aura-login__avatar-stack">
              <span>AK</span><span>MS</span><span>JR</span>
            </div>
            <div>
              <strong>Your circle is here</strong>
              <small>Conversations that feel present</small>
            </div>
            <span className="aura-login__online-dot" />
          </div>

          <div className="aura-login__trust">
            <span><ShieldCheck size={15} /> Private by design</span>
            <span><HeartHandshake size={15} /> Built for connection</span>
          </div>
        </section>

        <section className="aura-login__access">
          <div className="aura-login__form-wrap">
            <div className="aura-login__mobile-brand">
              <span className="aura-login__brand-mark" aria-hidden="true"><Sparkles size={19} /></span>
              Aura
            </div>
            <p className="aura-login__kicker">Welcome back</p>
            <h2>Sign in to your world</h2>
            <p className="aura-login__subcopy">Pick up your conversations right where you left them.</p>

            <form className="aura-login__form" onSubmit={onSubmit}>
              <label htmlFor="login-email">Email address</label>
              <div className="aura-login__field">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="login-email"
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
                <label htmlFor="login-password">Password</label>
                <span>Keep it secret</span>
              </div>
              <div className="aura-login__field">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={busy}
                />
                <button
                  className="aura-login__reveal"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="aura-login__error" role="alert">{error}</p>}
              <button className="aura-login__submit" type="submit" disabled={busy}>
                <span>{busy ? 'Signing you in...' : 'Continue to Aura'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>

            <p className="aura-login__signup">
              New to Aura? <Link to="/signup">Create your account</Link>
            </p>
            <p className="aura-login__legal">By continuing, you agree to a respectful and safe community.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
