import { useEffect, useRef } from 'react';

/**
 * Fire `record()` exactly once per mount, gated by a stable identity tuple
 * and a `when` predicate. Reusable guard for "log one impression per
 * (org, surface, variant) per session" patterns across funnel surfaces.
 *
 * Hooks run unconditionally — guard logic lives inside the effect, never
 * via early-return-before-hook in the caller. This was the regression
 * class in PromotionalPopup (May 2026 hook-order crash) that motivated
 * extracting the pattern.
 *
 * Identity tuple changes (e.g. variantKey rotates mid-session) are NOT
 * treated as "new impression" — the latched ref ensures one fire per
 * mount. Callers that need re-fire on identity change should remount via
 * `key={...}` instead of widening the dep array.
 */
export function useImpressionOnce(opts: {
  /** Gate that must be true for the effect to fire (e.g. config loaded, popup open, not preview). */
  when: boolean;
  /** Callback that performs the impression write. Errors are not caught — caller wraps as needed. */
  record: () => void;
}) {
  const { when, record } = opts;
  const recordedRef = useRef(false);
  // Hold the latest `record` in a ref so we don't re-fire when the
  // caller passes a fresh closure each render.
  const recordRef = useRef(record);
  recordRef.current = record;

  useEffect(() => {
    if (!when) return;
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordRef.current();
  }, [when]);
}
