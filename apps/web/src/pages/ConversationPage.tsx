import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LockKeyhole, Mic, PhoneOff, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectionState, Room, createLocalAudioTrack } from 'livekit-client';
import { ApiClientError } from '../lib/api';
import { conversationApi } from '../lib/conversationApi';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ending' | 'ended' | 'failed';

export function ConversationPage() {
  const navigate = useNavigate();
  const roomRef = useRef<Room | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState('Disconnected');

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  async function startConversation() {
    setError(null);
    setStatus('connecting');
    try {
      const started = await conversationApi.start();
      conversationIdRef.current = started.conversation.id;

      const room = new Room({
        adaptiveStream: true,
      });

      room.on('connectionStateChanged', (state) => {
        if (state === ConnectionState.Connected) {
          setConnectionState('Connected');
          setStatus('connected');
        } else if (state === ConnectionState.Connecting) {
          setConnectionState('Connecting');
        } else if (state === ConnectionState.Disconnected) {
          setConnectionState('Disconnected');
        }
      });

      await room.connect(started.livekit.url, started.livekit.token);

      const track = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(track);

      roomRef.current = room;
      setConnectionState('Connected');
      setStatus('connected');
    } catch (err) {
      setStatus('failed');
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Could not start conversation');
      }
      void roomRef.current?.disconnect();
      roomRef.current = null;
    }
  }

  async function endConversation() {
    const id = conversationIdRef.current;
    if (!id) {
      navigate('/', { replace: true });
      return;
    }
    setStatus('ending');
    setError(null);
    try {
      await conversationApi.end(id);
      await roomRef.current?.disconnect();
      roomRef.current = null;
      setConnectionState('Disconnected');
      setStatus('ended');
      conversationIdRef.current = null;
    } catch (err) {
      setStatus('failed');
      setError(err instanceof ApiClientError ? err.message : 'Could not end conversation');
    }
  }

  return (
    <main className="legacy-page legacy-conversation">
      <header className="legacy-topbar">
        <Link to="/app" className="legacy-brand"><span><Sparkles size={19} /></span><strong>Aura</strong></Link>
        <Link to="/app" className="legacy-back"><ArrowLeft size={16} /> Back to Aura</Link>
      </header>

      <section className={`legacy-voice ${status === 'connected' ? 'is-live' : ''}`}>
        <p className="legacy-eyebrow">Private voice space</p>
        <h1>Talk with Aura</h1>
        <p className="legacy-voice__intro">A calm space to speak freely. Aura listens, remembers context, and responds with care.</p>
        <div className="legacy-voice__visual" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span />
        </div>
        <p className="legacy-voice__state">
          {status === 'connected' ? 'Listening' : status === 'connecting' ? 'Connecting' : 'Ready'}
        </p>
        <p className="legacy-voice__status">
          {status === 'connected'
            ? "I'm listening..."
            : status === 'connecting'
              ? 'Setting up your secure voice session...'
              : 'Tap start to begin speaking with Aura.'}
        </p>

        <div className="legacy-voice__controls">
          {(status === 'idle' || status === 'ended' || status === 'failed') && (
            <button className="legacy-call-button" type="button" onClick={startConversation}>
              <Mic size={19} /> Talk to Aura
            </button>
          )}

          {(status === 'connecting' || status === 'connected' || status === 'ending') && (
            <button type="button" className="legacy-call-button is-danger" onClick={endConversation} disabled={status === 'ending'}>
              <PhoneOff size={19} /> End call
            </button>
          )}
        </div>

        <div className="legacy-voice__footer"><span><LockKeyhole size={14} /> Private session</span><span>Connection: {connectionState}</span></div>
        {error && <p className="legacy-feedback is-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
