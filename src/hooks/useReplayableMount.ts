import { useCallback, useState } from 'react';

/**
 * Returns a numeric `key` value plus a `replay()` function that bumps it.
 *
 * Why this exists:
 * Tailwind's `animate-in` / `slide-in-from-*` / `fade-in` utilities are
 * pure CSS animations that ONLY fire on first paint. If a component is
 * already mounted and you toggle a state flag (e.g. `setOpen(true)` on
 * an already-open popup), the enter animation will silently not replay —
 * the element snaps into its final position with no visible motion.
 *
 * The fix is to force React to unmount + remount the animated element
 * by giving its root a changing `key`. Use this hook to make that
 * intent self-documenting:
 *
 *   const { key, replay } = useReplayableMount();
 *   // when the operator hits "Restart preview":
 *   replay();
 *   // and on the animated root:
 *   <div key={key} className="animate-in slide-in-from-bottom-4">
 *
 * Single grep target for "where do we replay CSS-only enter animations":
 * `useReplayableMount`. If you find yourself reaching for a manual
 * `useState(0)` + `setN((n) => n + 1)` to drive a React `key`, use this
 * instead so the next contributor doesn't have to re-derive the reason.
 *
 * Comparable to framer-motion's `AnimatePresence` (which solves the same
 * problem for exit animations) but without the dependency — works for
 * any CSS-only enter animation, including Tailwind's `animate-*` utilities.
 */
export function useReplayableMount() {
  const [key, setKey] = useState(0);
  const replay = useCallback(() => {
    setKey((n) => n + 1);
  }, []);
  return { key, replay };
}
