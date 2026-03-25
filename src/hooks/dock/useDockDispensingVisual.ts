/**
 * useDockDispensingVisual — Persists the user's preferred dispensing visual aid.
 * Options: 'teardrop' (default) or 'bar' (thick vertical progress bar).
 */

import { useState, useCallback } from 'react';

export type DispensingVisual = 'teardrop' | 'bar';

const STORAGE_KEY = 'dock-dispensing-visual';

function readPreference(): DispensingVisual {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'bar') return 'bar';
  } catch {}
  return 'teardrop';
}

export function useDockDispensingVisual() {
  const [visual, setVisualState] = useState<DispensingVisual>(readPreference);

  const setVisual = useCallback((v: DispensingVisual) => {
    setVisualState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  }, []);

  return { visual, setVisual } as const;
}
