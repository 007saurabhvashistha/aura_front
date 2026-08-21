import { Badge } from './Badge';
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_SHORT_LABELS, type EntityType } from '../services/social';

// Aura hosts AI characters and real people in the same experience. This badge is
// the single, always-visible signal of which one you are looking at. AI must
// never be presented as a human, so it is rendered on every social surface.
export function EntityBadge({ type, compact = false }: { type: EntityType; compact?: boolean }) {
  return (
    <Badge variant={type === 'AI' ? 'teal' : 'info'} className={`se-entity-badge is-${type.toLowerCase()}`}>
      {compact ? ENTITY_TYPE_SHORT_LABELS[type] : ENTITY_TYPE_LABELS[type]}
    </Badge>
  );
}
