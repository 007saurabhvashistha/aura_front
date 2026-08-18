import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiClientError } from '../lib/api';
import { profileApi } from '../lib/profileApi';
import { SUPPORTED_LANGUAGES } from '../lib/catalogues';

type Step = 'name' | 'age' | 'language' | 'done';

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
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('name');
  const [displayName, setDisplayName] = useState('');
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
    <main className="auth-page">
      <h1 className="title">Let’s set up Aura</h1>
      <p className="muted">Just three quick things. You can add more later.</p>

      <div className="card form">
        {step === 'name' && (
          <>
            <h2>What should we call you?</h2>
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <button type="button" disabled={busy || !displayName.trim()} onClick={saveName}>
              Continue
            </button>
          </>
        )}

        {step === 'age' && (
          <>
            <h2>Verify your age</h2>
            <p className="muted">Aura is an 18+ experience. Your date of birth is not stored.</p>
            <label>
              Date of birth
              <div className="dob-row">
                <select
                  aria-label="Birth month"
                  value={dobMonth}
                  onChange={(e) => {
                    const month = e.target.value;
                    setDobMonth(month);
                    if (Number(dobDay) > daysInMonth(dobYear, month)) setDobDay('');
                  }}
                >
                  <option value="">Month</option>
                  {DOB_MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select aria-label="Birth day" value={dobDay} onChange={(e) => setDobDay(e.target.value)}>
                  <option value="">Day</option>
                  {dayOptions.map((day) => (
                    <option key={day} value={day}>
                      {Number(day)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Birth year"
                  value={dobYear}
                  onChange={(e) => {
                    const year = e.target.value;
                    setDobYear(year);
                    if (Number(dobDay) > daysInMonth(year, dobMonth)) setDobDay('');
                  }}
                >
                  <option value="">Year</option>
                  {DOB_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <button type="button" disabled={busy || !dateOfBirth} onClick={verifyAge}>
              Verify
            </button>
          </>
        )}

        {step === 'language' && (
          <>
            <h2>Your primary language</h2>
            <label>
              Language
              <select value={primaryLanguage} onChange={(e) => setPrimaryLanguage(e.target.value)}>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={saveLanguage}>
              Finish
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <h2>You’re all set 🎉</h2>
            <p className="muted">
              Aura will learn the rest through conversation. You can add interests, a communication
              style, and more anytime from your profile.
            </p>
            <button type="button" onClick={() => navigate('/', { replace: true })}>
              Enter Aura
            </button>
            <button type="button" className="ghost" onClick={() => navigate('/profile')}>
              Personalize now
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
