import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Languages,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiClientError } from '../lib/api';
import { profileApi } from '../lib/profileApi';
import { SUPPORTED_LANGUAGES } from '../lib/catalogues';

type Step = 'name' | 'age' | 'language' | 'done';

const STEPS: Array<{ id: Exclude<Step, 'done'>; label: string; detail: string }> = [
  { id: 'name', label: 'Your identity', detail: 'How people see you' },
  { id: 'age', label: 'Age check', detail: 'A safe 18+ community' },
  { id: 'language', label: 'Your language', detail: 'Make Aura feel natural' },
];

const CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));
const DOB_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ value: String(index + 1).padStart(2, '0'), label }));

function daysInMonth(year: string, month: string): number {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

/**
 * Minimal, required-first onboarding. Only display name, 18+ age verification,
 * and primary language are required — everything else is optional and lives on
 * the profile page. The server is authoritative for completeness.
 */
export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('name');
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dayOptions = Array.from({ length: daysInMonth(dobYear, dobMonth) }, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  const dateOfBirth = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : '';
  const activeStep = step === 'done' ? STEPS.length : STEPS.findIndex((item) => item.id === step);

  async function saveName() {
    setError(null);
    setBusy(true);
    try {
      await profileApi.updateMe({ displayName });
      setStep('age');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save name');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAge() {
    setError(null);
    setBusy(true);
    try {
      await profileApi.verifyAge(dateOfBirth);
      setStep('language');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setError('You must be at least 18 to use Aura.');
      } else {
        setError(err instanceof ApiClientError ? err.message : 'Age verification failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveLanguage() {
    setError(null);
    setBusy(true);
    try {
      await profileApi.updateMe({ primaryLanguage });
      await refreshProfile();
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save language');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="aura-onboarding">
      <div className="aura-onboarding__shell">
        <aside className="aura-onboarding__rail">
          <div className="aura-onboarding__brand">
            <span aria-hidden="true"><Sparkles size={20} /></span>
            <strong>Aura</strong>
          </div>

          <div className="aura-onboarding__intro">
            <p>Personalize your space</p>
            <h1>A few details.<br />A better Aura.</h1>
            <span>Three thoughtful steps to make every interaction feel more natural.</span>
          </div>

          <ol className="aura-onboarding__steps">
            {STEPS.map((item, index) => {
              const isComplete = activeStep > index;
              const isActive = activeStep === index;
              return (
                <li key={item.id} className={`${isActive ? 'is-active' : ''}${isComplete ? ' is-complete' : ''}`}>
                  <span>{isComplete ? <Check size={15} /> : index + 1}</span>
                  <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                </li>
              );
            })}
          </ol>

          <p className="aura-onboarding__privacy"><ShieldCheck size={15} /> Your details stay private and protected.</p>
        </aside>

        <section className="aura-onboarding__workspace">
          <div className="aura-onboarding__mobile-head">
            <div className="aura-onboarding__brand">
              <span aria-hidden="true"><Sparkles size={18} /></span><strong>Aura</strong>
            </div>
            <span>{step === 'done' ? 'Complete' : `Step ${activeStep + 1} of ${STEPS.length}`}</span>
          </div>

          <div className="aura-onboarding__progress" aria-hidden="true">
            <span style={{ width: `${Math.min(((activeStep + 1) / STEPS.length) * 100, 100)}%` }} />
          </div>

          <div key={step} className={`aura-onboarding__panel${step === 'done' ? ' is-done' : ''}`}>
            {step === 'name' && (
              <>
                <span className="aura-onboarding__icon"><UserRound size={24} /></span>
                <p className="aura-onboarding__eyebrow">Your identity</p>
                <h2>What should we call you?</h2>
                <p className="aura-onboarding__copy">This is the name people and companions will see across Aura.</p>
                <label htmlFor="onboarding-name">Display name</label>
                <div className="aura-onboarding__field">
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    id="onboarding-name"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    placeholder="Your display name"
                    autoComplete="name"
                    required
                  />
                </div>
                <p className="aura-onboarding__hint">You can change this anytime from your profile.</p>
                <button className="aura-onboarding__primary" type="button" disabled={busy || !displayName.trim()} onClick={saveName}>
                  <span>{busy ? 'Saving...' : 'Continue'}</span><ArrowRight size={18} />
                </button>
              </>
            )}

            {step === 'age' && (
              <>
                <button className="aura-onboarding__back" type="button" onClick={() => setStep('name')} aria-label="Back to name">
                  <ArrowLeft size={17} /> Back
                </button>
                <span className="aura-onboarding__icon"><CalendarDays size={24} /></span>
                <p className="aura-onboarding__eyebrow">Age check</p>
                <h2>A safe space for adults</h2>
                <p className="aura-onboarding__copy">Aura is an 18+ experience. Your date of birth is used once for verification and is never stored.</p>
                <label>Date of birth</label>
                <div className="aura-onboarding__date">
                  <select
                    aria-label="Birth month"
                    value={dobMonth}
                    onChange={(event) => {
                      const month = event.target.value;
                      setDobMonth(month);
                      if (Number(dobDay) > daysInMonth(dobYear, month)) setDobDay('');
                    }}
                  >
                    <option value="">Month</option>
                    {DOB_MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                  </select>
                  <select aria-label="Birth day" value={dobDay} onChange={(event) => setDobDay(event.target.value)}>
                    <option value="">Day</option>
                    {dayOptions.map((day) => <option key={day} value={day}>{Number(day)}</option>)}
                  </select>
                  <select
                    aria-label="Birth year"
                    value={dobYear}
                    onChange={(event) => {
                      const year = event.target.value;
                      setDobYear(year);
                      if (Number(dobDay) > daysInMonth(year, dobMonth)) setDobDay('');
                    }}
                  >
                    <option value="">Year</option>
                    {DOB_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div className="aura-onboarding__assurance"><ShieldCheck size={17} /><span><strong>Private verification</strong>Your date of birth will not be saved.</span></div>
                <button className="aura-onboarding__primary" type="button" disabled={busy || !dateOfBirth} onClick={verifyAge}>
                  <span>{busy ? 'Verifying...' : 'Verify and continue'}</span><ArrowRight size={18} />
                </button>
              </>
            )}

            {step === 'language' && (
              <>
                <button className="aura-onboarding__back" type="button" onClick={() => setStep('age')} aria-label="Back to age check">
                  <ArrowLeft size={17} /> Back
                </button>
                <span className="aura-onboarding__icon"><Languages size={24} /></span>
                <p className="aura-onboarding__eyebrow">Your language</p>
                <h2>How do you express yourself?</h2>
                <p className="aura-onboarding__copy">Choose the language you are most comfortable using. You can add more later.</p>
                <label htmlFor="onboarding-language">Primary language</label>
                <div className="aura-onboarding__field">
                  <Languages size={18} aria-hidden="true" />
                  <select id="onboarding-language" value={primaryLanguage} onChange={(event) => setPrimaryLanguage(event.target.value)}>
                    {SUPPORTED_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
                  </select>
                </div>
                <p className="aura-onboarding__hint">Aura will use this for conversations and recommendations.</p>
                <button className="aura-onboarding__primary" type="button" disabled={busy} onClick={saveLanguage}>
                  <span>{busy ? 'Finishing...' : 'Finish setup'}</span><ArrowRight size={18} />
                </button>
              </>
            )}

            {step === 'done' && (
              <>
                <span className="aura-onboarding__success"><Check size={32} /></span>
                <p className="aura-onboarding__eyebrow">You are ready</p>
                <h2>Welcome to Aura, {displayName.trim()}.</h2>
                <p className="aura-onboarding__copy">Your space is ready. Discover people and companions, or add a few more details to shape your experience.</p>
                <div className="aura-onboarding__done-actions">
                  <button className="aura-onboarding__primary" type="button" onClick={() => navigate('/app', { replace: true })}>
                    <span>Enter Aura</span><ArrowRight size={18} />
                  </button>
                  <button className="aura-onboarding__secondary" type="button" onClick={() => navigate('/profile')}>
                    Personalize profile
                  </button>
                </div>
              </>
            )}

            {error && <p className="aura-onboarding__error" role="alert">{error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
