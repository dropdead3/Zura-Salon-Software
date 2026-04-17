/**
 * useVisibilityContractAudit — Aggregates Visibility Contract suppressions.
 *
 * Doctrine: Visibility Contracts (mem://architecture/visibility-contracts).
 * Returns the rolling history of suppressed surfaces (capped at 50 entries) so
 * a future devtool panel can render the full silence-feed without scrolling
 * console logs. In production this hook returns an empty, stable array — it
 * never subscribes, never allocates, and is safe to call anywhere.
 */

import { useEffect, useState } from 'react';
import {
  type SuppressionEvent,
  getSuppressionHistory,
  subscribeToSuppressions,
} from '@/lib/dev/visibility-contract-bus';

const EMPTY: SuppressionEvent[] = [];

export function useVisibilityContractAudit(): SuppressionEvent[] {
  const [events, setEvents] = useState<SuppressionEvent[]>(() =>
    import.meta.env.DEV ? getSuppressionHistory() : EMPTY,
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Resync on mount in case suppressions fired before the listener attached.
    setEvents(getSuppressionHistory());
    return subscribeToSuppressions(() => {
      setEvents(getSuppressionHistory());
    });
  }, []);

  return events;
}
