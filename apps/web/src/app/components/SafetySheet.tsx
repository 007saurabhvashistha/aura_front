import { useState } from 'react';
import { consumerApi, REPORT_REASONS, type ReportReason } from '../data/consumerApi';

/**
 * Report and block sheet. Both actions are irreversible enough to deserve an explicit
 * confirmation step, so the sheet never acts on a single tap.
 */
export function SafetySheet({
  profileId,
  displayName,
  onClose,
  onBlocked,
}: {
  profileId: string;
  displayName: string;
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const [view, setView] = useState<'menu' | 'report' | 'confirm-block' | 'done'>('menu');
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState('');

  async function submitReport(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await consumerApi.report(profileId, { reason, details: details.trim() || undefined });
      if (alsoBlock) {
        await consumerApi.block(profileId);
        onBlocked?.();
      }
      setDoneMessage(
        alsoBlock
          ? `Thanks for telling us. ${displayName} has been blocked and our team will review this.`
          : 'Thanks for telling us. Our team will review this.',
      );
      setView('done');
    } catch {
      setError('That could not be submitted. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitBlock(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await consumerApi.block(profileId);
      onBlocked?.();
      setDoneMessage(`${displayName} has been blocked. You will not see each other on Aura.`);
      setView('done');
    } catch {
      setError('That could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aa-overlay" role="dialog" aria-modal="true" aria-label={`Options for ${displayName}`}>
      <button type="button" className="aa-overlay-scrim" aria-label="Close" onClick={onClose} />
      <div className="aa-sheet">
        {view === 'menu' && (
          <>
            <h2 className="aa-sheet-title">{displayName}</h2>
            <p className="aa-sheet-sub">Choose what you want to do.</p>
            <div className="aa-sheet-actions">
              <button type="button" className="aa-btn" onClick={() => setView('report')}>
                Report this account
              </button>
              <button type="button" className="aa-btn is-danger" onClick={() => setView('confirm-block')}>
                Block
              </button>
              <button type="button" className="aa-btn is-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {view === 'report' && (
          <>
            <h2 className="aa-sheet-title">Report {displayName}</h2>
            <p className="aa-sheet-sub">This is sent to the Aura safety team. They will not see your name.</p>
            <label className="aa-field">
              <span>Reason</span>
              <select
                className="aa-select"
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
              >
                {REPORT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="aa-field">
              <span>Anything else? (optional)</span>
              <textarea
                className="aa-textarea"
                rows={3}
                maxLength={1000}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Add context that would help us review this."
              />
            </label>
            <label className="aa-check">
              <input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} />
              <span>Also block {displayName}</span>
            </label>
            {error && <p className="aa-error">{error}</p>}
            <div className="aa-sheet-actions">
              <button type="button" className="aa-btn is-primary" disabled={busy} onClick={() => void submitReport()}>
                {busy ? 'Sending…' : 'Submit report'}
              </button>
              <button type="button" className="aa-btn is-ghost" onClick={() => setView('menu')}>
                Back
              </button>
            </div>
          </>
        )}

        {view === 'confirm-block' && (
          <>
            <h2 className="aa-sheet-title">Block {displayName}?</h2>
            <p className="aa-sheet-sub">
              You will not see each other in Discover, feeds or messages. Any follows between you are removed. You can
              undo this in Settings.
            </p>
            {error && <p className="aa-error">{error}</p>}
            <div className="aa-sheet-actions">
              <button type="button" className="aa-btn is-danger" disabled={busy} onClick={() => void submitBlock()}>
                {busy ? 'Blocking…' : 'Block'}
              </button>
              <button type="button" className="aa-btn is-ghost" onClick={() => setView('menu')}>
                Cancel
              </button>
            </div>
          </>
        )}

        {view === 'done' && (
          <>
            <h2 className="aa-sheet-title">Done</h2>
            <p className="aa-sheet-sub">{doneMessage}</p>
            <div className="aa-sheet-actions">
              <button type="button" className="aa-btn is-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
