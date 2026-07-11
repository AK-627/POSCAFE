'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export function useNotifications() {
  const socket = useSocket('notifications');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (n: AppNotification) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    });

    socket.on('unreadCount', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('notificationRead', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    });

    return () => {
      socket.off('notification');
      socket.off('unreadCount');
      socket.off('notificationRead');
    };
  }, [socket]);

  return { notifications, unreadCount };
}
