/**
 * visibility-contract-bus — Dev-only event bus for Visibility Contract suppressions.
 *
 * Doctrine: Visibility Contracts (mem://architecture/visibility-contracts).
 * When a materiality-gated surface returns null, it should report the suppression
 * here so that `useVisibilityContractAudit()` can aggregate every silence into a
 * single in-memory feed. Beats scrolling console logs.
 *
 * Production builds: every export is a no-op. The bus never holds memory, never
 * fires listeners, never emits console output. Safe to import anywhere.
 */

export interface SuppressionEvent {
  source: string;
  reason: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

type Listener = (event: SuppressionEvent) => void;

const MAX_HISTORY = 50;
const isDev = import.meta.env.DEV;

const listeners = new Set<Listener>();
const history: SuppressionEvent[] = [];

/**
 * Components call this from their suppression branch, e.g.:
 *   reportVisibilitySuppression('velocity-card', 'no-trigger-week', { maxWeekCount, threshold });
 *
 * In production this is a no-op (gated on `import.meta.env.DEV`).
 */
export function reportVisibilitySuppression(
  source: string,
  reason: string,
  payload: Record<string, unknown> = {},
): void {
  if (!isDev) return;

  const event: SuppressionEvent = {
    source,
    reason,
    payload,
    timestamp: Date.now(),
  };

  history.push(event);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  // Mirror to console.debug so existing log-tailing workflows still work.
  // eslint-disable-next-line no-console
  console.debug(`[${source}] suppressed:`, { reason, ...payload });

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Listener errors must not break the reporting surface.
    }
  }
}

/** Subscribe to suppression events. Returns an unsubscribe function. Dev-only. */
export function subscribeToSuppressions(listener: Listener): () => void {
  if (!isDev) return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot of the current suppression history (most-recent last). Dev-only. */
export function getSuppressionHistory(): SuppressionEvent[] {
  if (!isDev) return [];
  return history.slice();
}
