import { useCallback, useRef, useState } from 'react';

/**
 * Three-phase presence lifecycle for ephemeral surfaces (popups, toasts,
 * drawers, sheets, modals) that need to play a CSS exit animation BEFORE
 * unmounting.
 *
 * Why this exists:
 * The naive close path is `setOpen(false)` → component unmounts immediately,
 * exit animation never plays. The visible result is a hard cut instead of
 * a graceful close. The fix is a phase machine that keeps the surface
 * mounted in a `closing` state, plays the exit animation, then finalizes
 * unmount on `animationend`. Pair with `useReplayableMount` for entrance
 * replay choreography — one hook owns "make the entrance play again",
 * this one owns "make the exit play before unmount".
 *
 * Phase semantics:
 *   'entering'  → enter animation in flight (non-load-bearing for unmount)
 *   'visible'   → static, awaiting interaction / timer
 *   'closing'   → exit animation in flight; surface still mounted
 *   (after animationend on the root → onExit() fires, caller unmounts)
 *
 * Usage:
 *   const { phase, beginExit, onAnimationEnd, isClosing, reset } =
 *     usePresenceLifecycle({ onExit: (reason) => { setOpen(false); } });
 *
 *   // close handlers fire side-effects immediately, then begin the exit:
 *   function handleSoftClose() { writeDismissal(); beginExit('soft'); }
 *
 *   // each variant root carries the handler:
 *   <div onAnimationEnd={onAnimationEnd}
 *        className={cn(base, isClosing ? exitClasses : enterClasses)} />
 *
 * Comparable to framer-motion's `AnimatePresence` but without the
 * dependency — works for any CSS-only exit animation including Tailwind's
 * `animate-out` utilities.
 *
 * Single grep target for "where do we wait for an exit animation before
 * unmounting": `usePresenceLifecycle`.
 */
export type PresencePhase = 'entering' | 'visible' | 'closing';

export interface UsePresenceLifecycleOptions<TReason extends string = string> {
  /**
   * Fired exactly once per close cycle, after the exit animation completes
   * on the root element. Use it to flip the parent's `open` flag and run
   * any post-close side effects (e.g. surface a FAB).
   */
  onExit: (reason: TReason | null) => void;
}

export interface UsePresenceLifecycle<TReason extends string = string> {
  phase: PresencePhase;
  isEntering: boolean;
  isVisible: boolean;
  isClosing: boolean;
  /**
   * Start the exit animation. Idempotent within a single close cycle —
   * a second `beginExit` while already closing keeps the original reason
   * (the animation is already in flight). Captures the reason so the
   * parent can branch behavior in `onExit` (e.g. accept vs soft-dismiss).
   */
  beginExit: (reason?: TReason) => void;
  /**
   * Bind to the animated root's `onAnimationEnd`. Only finalizes when in
   * the `closing` phase and the event fires on the root itself (children's
   * animations bubble up and would otherwise trigger premature finalize).
   */
  onAnimationEnd: (e: React.AnimationEvent<HTMLElement>) => void;
  /**
   * Reset to `entering`. Use when the parent reopens the surface after a
   * close cycle (e.g. operator hits "Restart preview"). Pairs with
   * `useReplayableMount.replay()` to also re-trigger the enter animation.
   */
  reset: () => void;
  /** Mark the entrance as complete. Optional — most callers can ignore. */
  markVisible: () => void;
}

export function usePresenceLifecycle<TReason extends string = string>(
  options: UsePresenceLifecycleOptions<TReason>,
): UsePresenceLifecycle<TReason> {
  const [phase, setPhase] = useState<PresencePhase>('entering');
  const pendingReasonRef = useRef<TReason | null>(null);
  // Stash the latest onExit in a ref so the returned `onAnimationEnd`
  // callback stays stable across renders (parents typically pass an
  // inline arrow function for `onExit`).
  const onExitRef = useRef(options.onExit);
  onExitRef.current = options.onExit;

  const beginExit = useCallback((reason?: TReason) => {
    setPhase((prev) => {
      // Idempotent: already closing → keep the original reason.
      if (prev === 'closing') return prev;
      pendingReasonRef.current = reason ?? null;
      return 'closing';
    });
  }, []);

  const onAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLElement>) => {
      // Only react to our own root's animation, not nested children
      // (e.g. countdown bars) bubbling up.
      if (e.target !== e.currentTarget) return;
      // Use functional setState to read the latest phase without adding
      // it to the dep array (would force a new callback every render).
      setPhase((prev) => {
        if (prev !== 'closing') return prev;
        const reason = pendingReasonRef.current;
        pendingReasonRef.current = null;
        // Defer the parent callback so the unmount happens AFTER React
        // finishes processing this event handler — avoids "setState during
        // render" warnings if the parent flips `open` synchronously.
        queueMicrotask(() => onExitRef.current(reason));
        return 'visible'; // ready for the next entrance
      });
    },
    [],
  );

  const reset = useCallback(() => {
    pendingReasonRef.current = null;
    setPhase('entering');
  }, []);

  const markVisible = useCallback(() => {
    setPhase((prev) => (prev === 'entering' ? 'visible' : prev));
  }, []);

  return {
    phase,
    isEntering: phase === 'entering',
    isVisible: phase === 'visible',
    isClosing: phase === 'closing',
    beginExit,
    onAnimationEnd,
    reset,
    markVisible,
  };
}
