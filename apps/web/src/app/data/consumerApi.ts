import { apiRequest } from '../../lib/api';

/**
 * Consumer-facing endpoints that have no registry of their own. These are thin calls on
 * the existing social contracts; no duplicate state model is introduced.
 */

const BASE = '/api/v1/social';

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'impersonation'
  | 'nudity'
  | 'hate'
  | 'self_harm'
  | 'underage'
  | 'other';

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'underage', label: 'Under 18' },
  { value: 'other', label: 'Something else' },
];

export interface NotificationItem {
  id: string;
  type: string;
  body: string;
  entityId: string | null;
  actorProfileId: string | null;
  actorName: string | null;
  actorHandle: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  unread: number;
  items: NotificationItem[];
}

export interface BlockedProfile {
  id: string;
  displayName: string;
  handle: string;
}

export const consumerApi = {
  notifications: (): Promise<NotificationFeed> => apiRequest<NotificationFeed>(`${BASE}/me/notifications`),
  markNotificationsRead: (): Promise<null> =>
    apiRequest<null>(`${BASE}/me/notifications/read`, { method: 'POST' }),
  blocked: (): Promise<BlockedProfile[]> => apiRequest<BlockedProfile[]>(`${BASE}/me/blocked`),
  block: (profileId: string): Promise<null> =>
    apiRequest<null>(`${BASE}/profiles/${profileId}/block`, { method: 'POST' }),
  unblock: (profileId: string): Promise<null> =>
    apiRequest<null>(`${BASE}/profiles/${profileId}/block`, { method: 'DELETE' }),
  report: (profileId: string, body: { reason: ReportReason; details?: string }): Promise<null> =>
    apiRequest<null>(`${BASE}/profiles/${profileId}/report`, { method: 'POST', body }),
};
