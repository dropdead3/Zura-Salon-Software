import { useState, useEffect, useCallback } from 'react';

export interface OfflineEvent {
  type: 'offline' | 'online';
  timestamp: number;
  duration?: string;
}

interface OfflineStatusState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
  offlineEvents: OfflineEvent[];
  currentOfflineDuration: string | null;
}

const OFFLINE_EVENTS_KEY = 'zura-offline-events';
const MAX_EVENTS = 50;

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${remainMinutes}m`;
}

function loadEvents(): OfflineEvent[] {
  try {
    const stored = localStorage.getItem(OFFLINE_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: OfflineEvent[]) {
  try {
    localStorage.setItem(OFFLINE_EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch (e) {
    console.error('[OfflineStatus] Save error:', e);
  }
}

export function useOfflineStatus(): OfflineStatusState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [offlineEvents, setOfflineEvents] = useState<OfflineEvent[]>(loadEvents);
  const [offlineSince, setOfflineSince] = useState<number | null>(
    navigator.onLine ? null : Date.now()
  );
  const [currentOfflineDuration, setCurrentOfflineDuration] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      const now = Date.now();
      const duration = offlineSince ? formatDuration(now - offlineSince) : undefined;

      setIsOnline(true);
      setLastOnline(new Date());
      setWasOffline(true);
      setOfflineSince(null);
      setCurrentOfflineDuration(null);

      setOfflineEvents(prev => {
        const updated = [...prev, { type: 'online' as const, timestamp: now, duration }];
        saveEvents(updated);
        return updated;
      });
    };

    const handleOffline = () => {
      const now = Date.now();
      setIsOnline(false);
      setOfflineSince(now);

      setOfflineEvents(prev => {
        const updated = [...prev, { type: 'offline' as const, timestamp: now }];
        saveEvents(updated);
        return updated;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineSince]);

  // Update duration ticker while offline
  useEffect(() => {
    if (!offlineSince) return;
    const interval = setInterval(() => {
      setCurrentOfflineDuration(formatDuration(Date.now() - offlineSince));
    }, 1000);
    return () => clearInterval(interval);
  }, [offlineSince]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    lastOnline,
    offlineEvents,
    currentOfflineDuration,
  };
}

// Hook for offline action queue
interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'zura-offline-actions';

export function useOfflineSync() {
  const { isOnline } = useOfflineStatus();
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending actions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[OfflineSync] Error loading pending actions:', error);
    }
  }, []);

  // Save pending actions to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('[OfflineSync] Error saving pending actions:', error);
    }
  }, [pendingActions]);

  // Queue an action for later sync
  const queueAction = useCallback((type: string, payload: any): string => {
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    setPendingActions(prev => [...prev, action]);
    console.log('[OfflineSync] Action queued:', action.id);
    
    return action.id;
  }, []);

  // Remove a specific action
  const removeAction = useCallback((id: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== id));
  }, []);

  // Clear all pending actions
  const clearActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  // Sync all pending actions when online
  const syncActions = useCallback(async (
    processor: (action: OfflineAction) => Promise<boolean>
  ) => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    console.log('[OfflineSync] Starting sync of', pendingActions.length, 'actions');

    const results: { id: string; success: boolean }[] = [];

    for (const action of pendingActions) {
      try {
        const success = await processor(action);
        results.push({ id: action.id, success });
        
        if (success) {
          console.log('[OfflineSync] Action synced:', action.id);
        } else {
          console.warn('[OfflineSync] Action failed:', action.id);
        }
      } catch (error) {
        console.error('[OfflineSync] Error processing action:', action.id, error);
        results.push({ id: action.id, success: false });
      }
    }

    // Remove successful actions
    const successIds = results.filter(r => r.success).map(r => r.id);
    setPendingActions(prev => prev.filter(a => !successIds.includes(a.id)));

    setIsSyncing(false);
    console.log('[OfflineSync] Sync complete:', successIds.length, 'succeeded');
  }, [isOnline, pendingActions, isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      // Request background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            (registration as any).sync.register('sync-offline-actions');
          }
        }).catch(console.error);
      }
    }
  }, [isOnline, pendingActions.length]);

  return {
    pendingActions,
    hasPendingActions: pendingActions.length > 0,
    pendingCount: pendingActions.length,
    isSyncing,
    queueAction,
    removeAction,
    clearActions,
    syncActions,
  };
}
