import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ChaChingItem {
  id: string;
  amount: number;
  timestamp: Date;
}

interface ChaChingHistoryContextValue {
  notifications: ChaChingItem[];
  unreadCount: number;
  addNotification: (amount: number) => void;
  markAllRead: () => void;
}

const ChaChingHistoryContext = createContext<ChaChingHistoryContextValue | null>(null);

const MAX_ITEMS = 50;

export function ChaChingHistoryProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ChaChingItem[]>([]);
  const [lastReadAt, setLastReadAt] = useState<Date>(new Date());

  const addNotification = useCallback((amount: number) => {
    const item: ChaChingItem = {
      id: crypto.randomUUID(),
      amount,
      timestamp: new Date(),
    };
    setNotifications((prev) => [item, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const unreadCount = notifications.filter((n) => n.timestamp > lastReadAt).length;

  const markAllRead = useCallback(() => {
    setLastReadAt(new Date());
  }, []);

  return (
    <ChaChingHistoryContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead }}>
      {children}
    </ChaChingHistoryContext.Provider>
  );
}

export function useChaChingHistory() {
  const ctx = useContext(ChaChingHistoryContext);
  if (!ctx) throw new Error('useChaChingHistory must be used within ChaChingHistoryProvider');
  return ctx;
}

/** Safe version that returns null outside the provider (for use in hooks that may fire before mount) */
export function useChaChingHistorySafe() {
  return useContext(ChaChingHistoryContext);
}
