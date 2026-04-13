import { useState, useEffect, useCallback, useRef } from 'react';

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
  clearOfflineEvents: () => void;
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

  // Use a ref so event listeners don't need offlineSince in their dep array (E6)
  const offlineSinceRef = useRef(offlineSince);
  offlineSinceRef.current = offlineSince;

  useEffect(() => {
    const handleOnline = () => {
      const now = Date.now();
      const duration = offlineSinceRef.current ? formatDuration(now - offlineSinceRef.current) : undefined;

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
  }, []); // Stable — no more [offlineSince] dependency

  // Update duration ticker while offline
  useEffect(() => {
    if (!offlineSince) return;
    const interval = setInterval(() => {
      setCurrentOfflineDuration(formatDuration(Date.now() - offlineSince));
    }, 1000);
    return () => clearInterval(interval);
  }, [offlineSince]);

  const clearOfflineEvents = useCallback(() => {
    setOfflineEvents([]);
    localStorage.removeItem(OFFLINE_EVENTS_KEY);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    lastOnline,
    offlineEvents,
    currentOfflineDuration,
    clearOfflineEvents,
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('[OfflineSync] Error saving pending actions:', error);
    }
  }, [pendingActions]);

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

  const removeAction = useCallback((id: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  const syncActions = useCallback(async (
    processor: (action: OfflineAction) => Promise<boolean>
  ) => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;

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

    const successIds = results.filter(r => r.success).map(r => r.id);
    setPendingActions(prev => prev.filter(a => !successIds.includes(a.id)));
    setIsSyncing(false);
    console.log('[OfflineSync] Sync complete:', successIds.length, 'succeeded');
  }, [isOnline, pendingActions, isSyncing]);

  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
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
