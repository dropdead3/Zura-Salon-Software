/**
 * Resolves the promotional popup config for the *current moment*, applying
 * any active scheduled-rotation entry from the library.
 *
 * Composition:
 *   - `usePromotionalPopup()` — wrapper config (the source of truth for
 *     `enabled`, targeting, `offerCode`, schedule queue).
 *   - `usePromoLibrary()` — saved-promo snapshots referenced by schedule entries.
 *   - `resolvePromotionalPopupForNow()` — pure merge.
 *
 * `now` is re-evaluated every minute via a tick state so a window crossing
 * (e.g. an entry that ends at 10:00) flips the rendered creative without a
 * full page reload. The resolver is pure and cheap; one re-render per minute
 * is well within the per-minute KPI budget.
 *
 * Returns the resolved settings (or null) plus the raw wrapper for callers
 * that need wrapper-only fields (e.g. funnel attribution by `offerCode`).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  usePromotionalPopup,
  type PromotionalPopupSettings,
} from './usePromotionalPopup';
import { usePromoLibrary } from './usePromoLibrary';
import { resolvePromotionalPopupForNow } from '@/lib/promo-schedule';

export interface UseResolvedPromotionalPopupResult {
  /** Resolved config (wrapper + active snapshot creative). */
  resolved: PromotionalPopupSettings | null;
  /** Raw wrapper config — use for `offerCode` / lifecycle / `enabled`. */
  wrapper: PromotionalPopupSettings | null;
  /** True when an entry is currently active. */
  hasActiveSchedule: boolean;
}

const TICK_MS = 60_000;

export function useResolvedPromotionalPopup(
  explicitOrgId?: string,
): UseResolvedPromotionalPopupResult {
  const { data: wrapper } = usePromotionalPopup(explicitOrgId);
  const { data: library } = usePromoLibrary(explicitOrgId);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const now = new Date();
    const resolved = resolvePromotionalPopupForNow(
      wrapper ?? null,
      library?.saved ?? [],
      now,
    );
    const hasActiveSchedule =
      !!wrapper?.schedule?.some((e) => {
        const s = Date.parse(e.startsAt);
        const en = Date.parse(e.endsAt);
        const t = now.getTime();
        return Number.isFinite(s) && Number.isFinite(en) && s <= t && en >= t;
      });
    return { resolved, wrapper: wrapper ?? null, hasActiveSchedule };
    // `tick` invalidates the memo on the heartbeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, library, tick]);
}
