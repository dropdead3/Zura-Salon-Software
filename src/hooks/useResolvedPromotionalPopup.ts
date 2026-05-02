/**
 * Resolves the promotional popup config for the *current visitor at the
 * current moment*. Composition order:
 *
 *   1. Schedule rotation (operator's explicit window-bound creative)
 *   2. A/B experiment variant (deterministic per visitor)
 *   3. Base wrapper config
 *
 * The resolver is pure — see `@/lib/promo-experiment` and
 * `@/lib/promo-schedule`. This hook adds:
 *
 *   - A 60s heartbeat so a window crossing flips the rendered creative
 *     without a full reload.
 *   - A stable per-session bucketing key (sessionStorage uuid) so a returning
 *     visitor stays in the same experiment arm during their session.
 *
 * Returns the resolved settings plus the raw wrapper (callers may need
 * wrapper-only fields for funnel attribution / lifecycle), the active
 * variantKey (stamped onto impression / response telemetry), and the
 * scheduleEntryId when a rotation is active.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  usePromotionalPopup,
  type PromotionalPopupSettings,
} from './usePromotionalPopup';
import { usePromoLibrary } from './usePromoLibrary';
import { resolvePromotionalPopupForVisitor } from '@/lib/promo-experiment';

const SESSION_BUCKET_KEY = 'zura.promo.bucket-sid';

function getOrCreateBucketingKey(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let sid = window.sessionStorage.getItem(SESSION_BUCKET_KEY);
    if (!sid) {
      sid =
        (crypto as unknown as { randomUUID?: () => string })?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_BUCKET_KEY, sid);
    }
    return sid;
  } catch {
    return 'fallback';
  }
}

export interface UseResolvedPromotionalPopupResult {
  /** Resolved config (wrapper + active snapshot creative). */
  resolved: PromotionalPopupSettings | null;
  /** Raw wrapper config — use for `offerCode` / lifecycle / `enabled`. */
  wrapper: PromotionalPopupSettings | null;
  /** True when a schedule entry is currently active. */
  hasActiveSchedule: boolean;
  /** Active experiment variant id (null when no experiment is running for
   *  this visitor, or a schedule rotation is overriding it). */
  variantKey: string | null;
  /** Active schedule entry id (null when no rotation is active). */
  scheduleEntryId: string | null;
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

  const bucketingKey = useMemo(() => getOrCreateBucketingKey(), []);

  return useMemo(() => {
    const now = new Date();
    const result = resolvePromotionalPopupForVisitor({
      cfg: wrapper ?? null,
      library: library?.saved ?? [],
      experiment: wrapper?.experiment ?? null,
      schedule: wrapper?.schedule,
      bucketingKey,
      now,
    });
    return {
      resolved: result.resolved,
      wrapper: wrapper ?? null,
      hasActiveSchedule: result.scheduleEntryId !== null,
      variantKey: result.variantKey,
      scheduleEntryId: result.scheduleEntryId,
    };
    // `tick` invalidates the memo on the heartbeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, library, tick, bucketingKey]);
}
