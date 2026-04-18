import { useCallback, useMemo } from 'react';

/**
 * Session-scoped animation gate.
 *
 * When `key` is provided, the first mount in a browser session animates;
 * subsequent mounts of any consumer using the same key skip the 0→value
 * sweep and snap to the final value. Real-time value-change deltas are
 * still expected to animate — gates only control the *initial* sweep.
 *
 * When `key` is omitted, this is a no-op: callers always animate.
 *
 * Pattern: matches `IncidentBanner`, `ClockInPromptDialog`, etc.
 */
export function useFirstSessionAnimation(key: string | undefined): {
  shouldAnimate: boolean;
  markAnimated: () => void;
} {
  const sessionKey = key ? `counter-animated::${key}` : null;

  const shouldAnimate = useMemo(() => {
    if (!sessionKey) return true;
    try {
      return sessionStorage.getItem(sessionKey) !== '1';
    } catch {
      return true;
    }
  }, [sessionKey]);

  const markAnimated = useCallback(() => {
    if (!sessionKey) return;
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      /* ignore — private mode, quota, etc. */
    }
  }, [sessionKey]);

  return { shouldAnimate, markAnimated };
}
