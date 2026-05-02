/**
 * Hero exit-progress signal — a single numeric value in [0, 1] published by
 * the hero section as the user scrolls past it.
 *
 *   0   = hero fully in view (page top).
 *   ~1  = hero fully scrolled out of view.
 *
 * Why this exists:
 *   Multiple downstream surfaces (sticky nav opacity, scroll-affordance
 *   fade-in, FAB reveal, page-progress indicators) each tend to bind their
 *   OWN `useScroll`/`window.scrollY` listener to figure out "has the user
 *   left the hero yet?" That's a duplicated source of truth — when the
 *   hero's height/anchor changes, every consumer drifts independently.
 *
 *   The hero is the authority on its own exit progress. It already computes
 *   `scrollYProgress` via `useScroll({ target: sectionRef })` inside
 *   `useHeroScrollAnimation`. Publishing that single value here lets every
 *   consumer subscribe to the same signal — no extra `useScroll` listeners,
 *   no anchor drift, no per-consumer recomputation.
 *
 * Lifecycle:
 *   - The hero's `useHeroScrollAnimation` hook calls `publishHeroExitProgress`
 *     on every scrollYProgress change while mounted, and clears the signal
 *     on unmount.
 *   - Consumers use `useHeroExitProgress()` to read the current value, OR
 *     `subscribeHeroExitProgress(cb)` for imperative use (e.g. inside
 *     existing `useEffect` scroll handlers being migrated off `window.scrollY`).
 *   - When no hero is mounted (non-public-site routes), reads return `null`
 *     so consumers can fall back to a safe default rather than acting on
 *     a stale "hero exit complete" value.
 *
 * NOT a MotionValue:
 *   We deliberately publish a plain number, not a framer-motion `MotionValue`,
 *   because the consumers we're freeing (sticky-nav opacity, button reveal,
 *   StickyBookButton/ScrollProgressButton) are imperative `useEffect` setters,
 *   not motion-bound styles. A plain pub/sub keeps the signal usable from
 *   any rendering library and avoids forcing framer-motion into consumers
 *   that don't need it.
 */
import { useEffect, useState } from 'react';

let currentValue: number | null = null;
const listeners = new Set<(value: number | null) => void>();

/** Publish the latest hero exit progress (0..1). Called by the hero only. */
export function publishHeroExitProgress(value: number): void {
  // Clamp to guard against scroll-progress overshoot at boundaries.
  const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
  if (currentValue === clamped) return;
  currentValue = clamped;
  for (const cb of listeners) cb(clamped);
}

/** Clear the signal (called on hero unmount). */
export function clearHeroExitProgress(): void {
  if (currentValue === null) return;
  currentValue = null;
  for (const cb of listeners) cb(null);
}

/** Read the current value imperatively. `null` when no hero is mounted. */
export function readHeroExitProgress(): number | null {
  return currentValue;
}

/** Imperative subscription. Returns an unsubscribe. Calls `cb` immediately with the current value. */
export function subscribeHeroExitProgress(
  cb: (value: number | null) => void,
): () => void {
  listeners.add(cb);
  cb(currentValue);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * React hook returning the current hero exit progress.
 *
 * Replace ad-hoc `window.scrollY > window.innerHeight * 0.5` checks with
 * `useHeroExitProgress() ?? 0` and a threshold (e.g. `> 0.5`). Falls back
 * to `null` when no hero is mounted so consumers on non-public-site routes
 * stay neutral.
 */
export function useHeroExitProgress(): number | null {
  const [value, setValue] = useState<number | null>(currentValue);
  useEffect(() => subscribeHeroExitProgress(setValue), []);
  return value;
}
