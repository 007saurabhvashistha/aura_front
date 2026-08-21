import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversationRegistry } from '../../admin/hooks/useConversationRegistry';
import { useIntegrationRegistry } from '../../admin/hooks/useIntegrationRegistry';
import { useSocialRegistry } from '../../admin/hooks/useSocialRegistry';
import { CALL_STATUS_LABELS, type CallStatus } from '../../admin/services/social';
import { AppHeader } from '../components/AppShell';
import { Avatar, shortTime } from '../components/identity';

const TERMINAL = ['ended', 'failed', 'declined'];

// Service notes carry operational detail (provider names, demo transport) that
// belongs in the control plane only.
const CALL_NOTES: Record<CallStatus, string> = {
  requested: 'Starting the call…',
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  active: 'You are connected.',
  ended: 'Call ended.',
  declined: 'Call declined.',
  failed: 'The call could not be connected. Please try again.',
};

export function CallPage() {
  const { callId = '' } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { getCallById, advanceCall, endCall } = useConversationRegistry();
  const { integrations } = useIntegrationRegistry();
  const { profiles } = useSocialRegistry();
  const [seconds, setSeconds] = useState(0);

  const realtime = integrations.find((integration) => integration.capability === 'realtime') ?? null;
  const transportOk = Boolean(realtime && realtime.enabled && realtime.status === 'connected');

  const call = getCallById(callId);
  const status = call?.status;
  const profile = call ? profiles.find((item) => item.id === call.profileId) ?? null : null;

  // The consumer app drives the call state machine itself; the service still
  // decides the verdict from realtime integration health.
  useEffect(() => {
    if (!callId || !status) return;
    if (status === 'active' || TERMINAL.includes(status)) return;
    const timer = window.setTimeout(() => advanceCall(callId, { forceDemoTransport: !transportOk }), 1100);
    return () => window.clearTimeout(timer);
  }, [callId, status, advanceCall, transportOk]);

  useEffect(() => {
    if (status !== 'active') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  if (!call) {
    return (
      <>
        <AppHeader title="Call" />
        <div className="aa-main">
          <p className="aa-empty" style={{ margin: 16 }}>
            This call is not available.
          </p>
        </div>
      </>
    );
  }

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <>
      <AppHeader
        title={`${call.kind === 'video' ? 'Video' : 'Voice'} call`}
        subtitle={call.participantName}
        back={
          <Link className="aa-btn is-sm is-ghost" to={`/app/chats/${call.conversationId}`}>
            ←
          </Link>
        }
      />
      <div className="aa-main" style={{ display: 'flex', flexDirection: 'column' }}>
        {!transportOk ? (
          <p className="aa-notice">
            Preview mode — live media is unavailable on this device right now, so the call runs without audio or video.
          </p>
        ) : null}
        <div className="aa-call">
          <div className="aa-call-stage">{profile ? <Avatar profile={profile} size="lg" /> : null}</div>
          <div>
            <div
              className={`aa-call-status${call.status === 'active' ? ' is-active' : ''}${
                call.status === 'failed' ? ' is-failed' : ''
              }`}
            >
              {CALL_STATUS_LABELS[call.status]}
              {call.status === 'active' ? ` · ${clock}` : ''}
            </div>
            <p className="aa-call-note">{CALL_NOTES[call.status]}</p>
          </div>

          <div className="aa-call-actions">
            {TERMINAL.includes(call.status) ? (
              <Link className="aa-btn is-primary" to={`/app/chats/${call.conversationId}`}>
                Back to chat
              </Link>
            ) : (
              <button
                type="button"
                className="aa-btn is-danger"
                onClick={() => {
                  endCall(call.id);
                  navigate(`/app/chats/${call.conversationId}`);
                }}
              >
                End call
              </button>
            )}
          </div>

          <div className="aa-call-log">
            <span className="aa-section-title">Call log</span>
            <ul>
              {call.events.map((event) => (
                <li key={event.id}>
                  {shortTime(event.timestamp)} · {CALL_STATUS_LABELS[event.status]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
