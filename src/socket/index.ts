import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants';

/**
 * Singleton Socket.io client. Connected after login with the current
 * access token; event handlers register per feature (rooms, chat, calls)
 * in later modules.
 */
let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
