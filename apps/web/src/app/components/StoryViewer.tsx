import { useState } from 'react';
import type { SocialProfile } from '../../admin/hooks/useSocialRegistry';
import { Avatar, shortTime } from './identity';

export function StoryViewer({ profile, onClose }: { profile: SocialProfile; onClose: () => void }) {
  const stories = profile.stories.filter((story) => story.status === 'active');
  const [index, setIndex] = useState(0);
  const story = stories[index];

  if (!story) return null;

  return (
    <div className="aa-overlay" role="dialog" aria-label={`Stories by ${profile.displayName}`}>
      <div className="aa-story-bar">
        {stories.map((item, i) => (
          <span key={item.id} className={`aa-story-seg${i <= index ? ' is-on' : ''}`} />
        ))}
      </div>
      <div className="aa-story-head">
        <Avatar profile={profile} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: 14 }}>{profile.displayName}</strong>
          </div>
          <div className="aa-person-handle">{shortTime(story.createdAt)}</div>
        </div>
        <button type="button" className="aa-btn is-ghost is-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="aa-story-body">{story.mediaLabel}</div>
      <p className="aa-story-caption">{story.caption}</p>
      <div className="aa-story-nav">
        <button
          type="button"
          className="aa-btn is-sm is-ghost"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <span className="aa-person-handle">
          {index + 1} / {stories.length} · {story.views} views
        </span>
        <button
          type="button"
          className="aa-btn is-sm is-ghost"
          onClick={() => (index + 1 >= stories.length ? onClose() : setIndex(index + 1))}
        >
          {index + 1 >= stories.length ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}
