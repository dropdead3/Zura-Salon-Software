import { useCallback, useEffect, useState } from 'react';

/**
 * Per-org PIN lockout state persisted in sessionStorage.
 *
 * Why sessionStorage (not localStorage):
 *  - Survives page refreshes, iPad sleep/wake, and PWA reloads — so a staffer
 *    can't bypass the rate limit by hammering F5.
 *  - Does NOT survive an explicit tab close, matching operator intent
 *    (closed tab = clean slate).
 *
 * Honors the alert-fatigue doctrine: this is the canonical lockout signal,
 * read by both the inline countdown and the disabled-pad state.
 */

function storageKey(orgId: string | null | undefined) {
  return orgId ? `pin_lockout_until:${orgId}` : null;
}

function readLockout(orgId: string | null | undefined): number | null {
  const key = storageKey(orgId);
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts) || ts <= Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return ts;
  } catch {
    return null;
  }
}

export function useSessionLockout(orgId: string | null | undefined) {
  const [lockoutUntil, setLockoutUntilState] = useState<number | null>(() =>
    readLockout(orgId),
  );

  // Re-hydrate when the orgId resolves async
  useEffect(() => {
    setLockoutUntilState(readLockout(orgId));
  }, [orgId]);

  const setLockoutUntil = useCallback(
    (until: number | null) => {
      const key = storageKey(orgId);
      setLockoutUntilState(until);
      if (!key || typeof window === 'undefined') return;
      try {
        if (until && until > Date.now()) {
          sessionStorage.setItem(key, String(until));
        } else {
          sessionStorage.removeItem(key);
        }
      } catch {
        // ignore quota / privacy-mode failures
      }
    },
    [orgId],
  );

  const clearLockout = useCallback(() => setLockoutUntil(null), [setLockoutUntil]);

  return { lockoutUntil, setLockoutUntil, clearLockout };
}
