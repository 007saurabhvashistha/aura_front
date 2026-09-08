import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="legacy-page legacy-not-found">
      <div className="legacy-not-found__content">
        <span className="legacy-not-found__icon"><Compass size={28} /></span>
        <div className="legacy-brand"><span><Sparkles size={18} /></span><strong>Aura</strong></div>
        <p className="legacy-eyebrow">Error 404</p>
        <h1>This path feels a little quiet.</h1>
        <p>The page you were looking for is not here, but your Aura space is only one step away.</p>
        <Link to="/app" className="legacy-primary-link"><ArrowLeft size={16} /> Return to Aura</Link>
      </div>
    </main>
  );
}
