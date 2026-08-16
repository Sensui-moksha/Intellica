// Realtime cross-tab and cross-component synchronization channel for Intellica
let syncChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('intellica_realtime_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

export const emitRealtimeEvent = (eventType, payload = {}) => {
  // 1. Dispatch custom event for current window/tab components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
  }

  // 2. Broadcast message across other open tabs/windows
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: eventType, payload, timestamp: Date.now() });
    } catch (err) {
      console.warn('Error broadcasting sync event:', err);
    }
  }
};

export const subscribeToRealtimeEvent = (eventType, callback) => {
  if (typeof window === 'undefined') return () => {};

  // Local window listener
  const handleLocal = (e) => {
    callback(e.detail);
  };
  window.addEventListener(eventType, handleLocal);

  // Broadcast channel listener for other tabs
  const handleBroadcast = (e) => {
    if (e.data?.type === eventType) {
      callback(e.data.payload);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcast);
  }

  // Cleanup function
  return () => {
    window.removeEventListener(eventType, handleLocal);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcast);
    }
  };
};

export const SYNC_EVENTS = {
  ACTIVITIES_UPDATED: 'intellica:activities_updated',
  PROFILE_UPDATED: 'intellica:profile_updated',
  APPROVALS_UPDATED: 'intellica:approvals_updated',
  NOTIFICATIONS_UPDATED: 'intellica:notifications_updated',
};
