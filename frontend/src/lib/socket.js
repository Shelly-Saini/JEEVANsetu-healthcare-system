import { io } from 'socket.io-client';
import { getAccessToken } from '../services/tokenStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined; // same-origin by default

let socket = null;

/**
 * getSocket — lazily creates a single shared Socket.IO connection. Returns
 * null if there's no access token yet (not logged in). Callers should treat
 * a failed/absent connection as "realtime unavailable" and keep working from
 * polled/fetched data — this is a progressive enhancement, not a dependency.
 */
export const getSocket = () => {
  const token = getAccessToken();
  if (!token) return null;

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      timeout: 4000,
    });
  }
  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
