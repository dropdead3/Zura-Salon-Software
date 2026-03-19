import { useState, useCallback } from 'react';

export type DockDevice = 'phone' | 'tablet' | 'full';

const STORAGE_KEY = 'dock-device-preview';

function readInitial(): DockDevice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'phone' || v === 'tablet' || v === 'full') return v;
  } catch {}
  return 'full';
}

export function useDockDevicePreview() {
  const [device, setDeviceRaw] = useState<DockDevice>(readInitial);

  const setDevice = useCallback((d: DockDevice) => {
    setDeviceRaw(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch {}
  }, []);

  return { device, setDevice } as const;
}
