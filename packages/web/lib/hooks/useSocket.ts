'use client';

/**
 * useSocket — creates a Socket.IO connection to a named namespace,
 * scoped to the current tenant. Returns the socket instance.
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export function useSocket(namespace: string): Socket | null {
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const s = io(`${WS_URL}/${namespace}`, {
      auth: { tenantId: user.tenantId, userId: user.id },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [namespace, isAuthenticated, user?.tenantId]);

  return socket;
}
