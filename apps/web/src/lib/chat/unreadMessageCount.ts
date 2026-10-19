'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const UNREAD_MESSAGES_REFRESH_EVENT = 'vibesbnb-unread-refresh';

export function requestUnreadMessagesRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNREAD_MESSAGES_REFRESH_EVENT));
  }
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const response = await fetch('/api/chat/unread-count', { cache: 'no-store' });
  if (!response.ok) return 0;
  const data = await response.json();
  return Number(data.count) || 0;
}

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchUnreadMessageCount());
    } catch {
      setCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    void refresh();

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 20000);

    window.addEventListener(UNREAD_MESSAGES_REFRESH_EVENT, refresh);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(UNREAD_MESSAGES_REFRESH_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [user?.id, refresh]);

  return count;
}
