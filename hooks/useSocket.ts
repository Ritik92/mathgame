'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SESSION_TOKEN_KEY = 'math_quiz_session';

export function useSocket(): TypedSocket | null {
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    const socketInstance: TypedSocket = io({
      path: '/socket.io',
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');

      // Try to restore session from localStorage
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (sessionToken) {
        console.log('🔐 Attempting to restore session...');
        socketInstance.emit('restoreSession', sessionToken);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
}

// Helper to store session token
export function storeSessionToken(token: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

// Helper to clear session token
export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}