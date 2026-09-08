import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { subscribeToEvents } from '../../lib/api';
import { consumerApi, type NotificationItem } from './consumerApi';

interface NotificationsValue {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const feed = await consumerApi.notifications();
      setItems(feed.items);
      setUnread(feed.unread);
      setError(null);
    } catch {
      // Notifications are additive; a failure must never block the surface.
      setError('Notifications are unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setItems([]);
      setUnread(0);
      setError(null);
      return;
    }

    void refresh();
    const unsubscribe = subscribeToEvents('/api/v1/social/me/stream', (event) => {
      if (event === 'notification') void refresh();
    });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refresh, status]);

  const markRead = useCallback(async (notificationId: string): Promise<void> => {
    const target = items.find((item) => item.id === notificationId);
    if (!target || target.readAt) return;
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, readAt } : item)));
    setUnread((count) => Math.max(0, count - 1));
    try {
      await consumerApi.markNotificationRead(notificationId);
    } catch {
      void refresh();
    }
  }, [items, refresh]);

  const markAllRead = useCallback(async (): Promise<void> => {
    if (unread === 0) return;
    setUnread(0);
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    try {
      await consumerApi.markNotificationsRead();
    } catch {
      void refresh();
    }
  }, [refresh, unread]);

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread, loading, error, refresh, markRead, markAllRead }),
    [items, unread, loading, error, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
