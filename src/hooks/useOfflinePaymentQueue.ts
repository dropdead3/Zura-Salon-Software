import { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '@/lib/format';

interface OfflinePayment {
  id: string;
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number;
  currency: string;
  timestamp: number;
  status: 'pending' | 'forwarded' | 'failed';
  cardLast4?: string;
  description?: string;
}

interface OfflinePaymentQueueState {
  pendingPayments: OfflinePayment[];
  pendingCount: number;
  pendingTotal: number;
  pendingTotalFormatted: string;
  forwardedCount: number;
  lastForwardedAt: Date | null;
  isForwarding: boolean;
}

const PAYMENT_QUEUE_KEY = 'zura-offline-payment-queue';
const FORWARDED_KEY = 'zura-forwarded-payments';

/**
 * Visibility layer for offline payments stored on the S710 reader.
 * The actual store-and-forward is handled by Stripe Terminal SDK —
 * this hook provides UI awareness of queue state.
 */
export function useOfflinePaymentQueue(): OfflinePaymentQueueState & {
  trackPayment: (payment: Omit<OfflinePayment, 'id' | 'status' | 'timestamp'>) => void;
  markForwarded: (ids: string[]) => void;
  clearForwarded: () => void;
} {
  const [pendingPayments, setPendingPayments] = useState<OfflinePayment[]>([]);
  const [forwardedCount, setForwardedCount] = useState(0);
  const [lastForwardedAt, setLastForwardedAt] = useState<Date | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PAYMENT_QUEUE_KEY);
      if (stored) setPendingPayments(JSON.parse(stored));

      const fwd = localStorage.getItem(FORWARDED_KEY);
      if (fwd) {
        const parsed = JSON.parse(fwd);
        setForwardedCount(parsed.count || 0);
        setLastForwardedAt(parsed.lastAt ? new Date(parsed.lastAt) : null);
      }
    } catch (e) {
      console.error('[OfflinePaymentQueue] Load error:', e);
    }
  }, []);

  // Persist pending
  useEffect(() => {
    try {
      localStorage.setItem(PAYMENT_QUEUE_KEY, JSON.stringify(pendingPayments));
    } catch (e) {
      console.error('[OfflinePaymentQueue] Save error:', e);
    }
  }, [pendingPayments]);

  const trackPayment = useCallback((payment: Omit<OfflinePayment, 'id' | 'status' | 'timestamp'>) => {
    const entry: OfflinePayment = {
      ...payment,
      id: crypto.randomUUID(),
      status: 'pending',
      timestamp: Date.now(),
    };
    setPendingPayments(prev => [...prev, entry]);
  }, []);

  const markForwarded = useCallback(async (ids: string[]) => {
    setIsForwarding(true);

    // Yield to let React render the isForwarding=true state
    await new Promise(resolve => setTimeout(resolve, 0));

    setPendingPayments(prev => prev.filter(p => !ids.includes(p.id)));
    const now = new Date();
    setForwardedCount(prev => {
      const newCount = prev + ids.length;
      localStorage.setItem(FORWARDED_KEY, JSON.stringify({ count: newCount, lastAt: now.toISOString() }));
      return newCount;
    });
    setLastForwardedAt(now);
    setIsForwarding(false);
  }, []);

  const clearForwarded = useCallback(() => {
    setForwardedCount(0);
    setLastForwardedAt(null);
    localStorage.removeItem(FORWARDED_KEY);
  }, []);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Format using the first payment's currency, defaulting to USD.
  // Amounts are in smallest currency unit (cents).
  const currency = pendingPayments[0]?.currency || 'USD';
  const pendingTotalFormatted = formatCurrency(pendingTotal / 100, { currency });

  return {
    pendingPayments,
    pendingCount: pendingPayments.length,
    pendingTotal,
    pendingTotalFormatted,
    forwardedCount,
    lastForwardedAt,
    isForwarding,
    trackPayment,
    markForwarded,
    clearForwarded,
  };
}
