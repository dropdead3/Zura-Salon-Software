import { useEffect, useState } from 'react';

/**
 * useDelayedRender — returns `true` only after `delay` ms have elapsed since mount.
 *
 * Used to suppress loader flicker on fast loads. If the parent unmounts the
 * loader before the delay elapses (because the data resolved), nothing ever
 * paints — perceived performance win.
 *
 * Default 200ms is below human flicker-perception threshold (~250ms).
 * Pass `delay={0}` to opt out (e.g. user-triggered "Refreshing…" actions
 * where instant feedback is required).
 */
export function useDelayedRender(delay: number = 200): boolean {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return visible;
}
