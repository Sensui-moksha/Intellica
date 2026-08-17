import { io } from 'socket.io-client';
import { emitRealtimeEvent, SYNC_EVENTS } from './syncEvents';

let socket = null;

/**
 * Initializes and manages real-time WebSocket connection using Socket.IO
 */
export const initSocketClient = () => {
  if (typeof window === 'undefined') return null;
  if (socket && socket.connected) return socket;

  const role = localStorage.getItem('role') || '';
  const department = localStorage.getItem('department') || '';
  const userId = localStorage.getItem('userId') || '';

  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    // Join role & department rooms for instant pushes
    socket.emit('join', {
      role: localStorage.getItem('role') || role,
      department: localStorage.getItem('department') || department,
      userId: localStorage.getItem('userId') || userId,
    });
  });

  // 1. Instant Notification Push
  socket.on('notification:new', (notif) => {
    emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED, notif);
  });

  // 2. Approvals State Change Push
  socket.on('approvals:update', (data) => {
    emitRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, data);
    emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED, data);
  });

  // 3. Broadcast Sync Events
  socket.on('sync:approvals', (data) => {
    emitRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, data);
  });

  socket.on('sync:credits', (data) => {
    emitRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, data);
    emitRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, data);
  });

  socket.on('sync:activities', (data) => {
    emitRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, data);
  });

  socket.on('disconnect', () => {
    // Reconnection is automatic
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocketClient();
  }
  return socket;
};

export const joinSocketRooms = (userData) => {
  if (!socket) {
    initSocketClient();
  }
  if (socket && socket.connected && userData) {
    socket.emit('join', userData);
  }
};
