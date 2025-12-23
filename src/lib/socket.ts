export const onNotification = (callback: (notification: any) => void) => {
  const sock = getSocket();
  if (sock) sock.on('notification', callback);
};

export const offNotification = (callback?: (notification: any) => void) => {
  const sock = getSocket();
  if (sock) sock.off('notification', callback);
};
import { io, type Socket } from 'socket.io-client';
import { authStorage } from './auth';

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) || 'http://localhost:4010';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const initializeSocket = (): Socket => {
  if (socket) return socket;

  const token = authStorage.getAccessToken();
  if (!token) throw new Error('No access token available');

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected manually');
  }
};

export const joinOrganization = (organizationId: string) => {
  const sock = getSocket();
  if (!sock) throw new Error('Socket not initialized');
  if (!organizationId) throw new Error('Missing organizationId');

  // socket.io buffers emits until connected
  sock.emit('join_org', { organizationId });
};

export const sendMessage = (payload: {
  organizationId: string;
  message: string;
  replyToId?: string;
  attachments?: any[];
}) => {
  const sock = getSocket();
  if (!sock) throw new Error('Socket not initialized');
  sock.emit('message', payload);
};

export const sendReaction = (payload: { messageId: string; reaction: string }) => {
  const sock = getSocket();
  if (!sock) throw new Error('Socket not initialized');
  sock.emit('reaction', payload);
};

export const sendTyping = (organizationId: string) => {
  const sock = getSocket();
  if (!sock) return;
  sock.emit('typing', { organizationId });
};

export const onMessage = (callback: (message: any) => void) => {
  const sock = getSocket();
  if (sock) sock.on('message', callback);
};

export const onReaction = (callback: (message: any) => void) => {
  const sock = getSocket();
  if (sock) sock.on('reaction', callback);
};

export const onTyping = (callback: (data: { userId: string }) => void) => {
  const sock = getSocket();
  if (sock) sock.on('typing', callback);
};

export const offMessage = (callback?: (message: any) => void) => {
  const sock = getSocket();
  if (sock) sock.off('message', callback);
};

export const offReaction = (callback?: (message: any) => void) => {
  const sock = getSocket();
  if (sock) sock.off('reaction', callback);
};

export const offTyping = (callback?: (data: { userId: string }) => void) => {
  const sock = getSocket();
  if (sock) sock.off('typing', callback);
};

