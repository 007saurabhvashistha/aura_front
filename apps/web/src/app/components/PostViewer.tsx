import { Link } from 'react-router-dom';
import type { PostItem, SocialProfile } from '../../admin/hooks/useSocialRegistry';
import { Avatar } from './identity';

export function PostViewer({
  profile,
  post,
  onClose,
}: {
  profile: SocialProfile;
  post: PostItem;
  onClose: () => void;
}) {
  return (
    <div className="aa-overlay" role="dialog" aria-label={`Post by ${profile.displayName}`}>
      <div className="aa-story-head">
        <Avatar profile={profile} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link className="aa-link" to={`/app/u/${profile.id}`} onClick={onClose}>
            <strong style={{ fontSize: 14 }}>{profile.displayName}</strong>
          </Link>
          <div className="aa-person-handle">
            {profile.handle} · {post.createdAt}
          </div>
        </div>
        <button type="button" className="aa-btn is-ghost is-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="aa-story-body">{post.mediaLabel}</div>
      <p className="aa-story-caption">{post.caption}</p>
      <div className="aa-post-meta" style={{ padding: '0 16px 16px' }}>
        <span>{post.likes} likes</span>
        <span>{post.comments} comments</span>
        <span>{post.visibility === 'public' ? 'Public' : 'Followers'}</span>
      </div>
      <div className="aa-story-nav">
        <Link className="aa-btn is-sm" to={`/app/u/${profile.id}`} onClick={onClose}>
          View profile
        </Link>
      </div>
    </div>
  );
}
