import { useEffect, useState } from 'react';

/**
 * useDelayedRender — returns mount/visible state for cooldown + fade-in.
 *
 * Two-stage state to enable a smooth CSS opacity transition:
 *   - `mounted` flips true after `delay` ms (the cooldown gate).
 *   - `visible` flips true one frame later, giving CSS a 0→1 starting state
 *     to animate against. Without the rAF gap, the element mounts already
 *     at opacity-100 and the transition is a no-op (hard paint).
 *
 * Usage:
 *   const { mounted, visible } = useDelayedRender();
 *   if (!mounted) return null;
 *   return <div data-loader-fade={visible ? 'in' : 'out'} className="opacity-0 transition-opacity duration-150 data-[loader-fade=in]:opacity-100">…</div>;
 *
 * Default 200ms cooldown is below human flicker-perception threshold (~250ms).
 * Pass `delay={0}` for instant feedback (e.g. user-triggered "Refreshing…").
 */
export function useDelayedRender(delay: number = 200): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(delay === 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (delay === 0) {
      // Instant mount path — still gate `visible` behind one frame so the
      // fade-in transition runs even when delay is zero.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      setMounted(true);
      // Defer visible flip to the next frame so CSS sees the 0→1 transition.
      requestAnimationFrame(() => setVisible(true));
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);

  return { mounted, visible };
}
