import { useState, useCallback } from 'react';

export type DockDevice = 'phone' | 'tablet' | 'full';
export type DockOrientation = 'portrait' | 'landscape';

const DEVICE_KEY = 'dock-device-preview';
const ORIENTATION_KEY = 'dock-orientation-preview';

function readInitialDevice(): DockDevice {
  try {
    const v = localStorage.getItem(DEVICE_KEY);
    if (v === 'phone' || v === 'tablet' || v === 'full') return v;
  } catch {}
  return 'full';
}

function readInitialOrientation(): DockOrientation {
  try {
    const v = localStorage.getItem(ORIENTATION_KEY);
    if (v === 'portrait' || v === 'landscape') return v;
  } catch {}
  return 'portrait';
}

export function useDockDevicePreview() {
  const [device, setDeviceRaw] = useState<DockDevice>(readInitialDevice);
  const [orientation, setOrientationRaw] = useState<DockOrientation>(readInitialOrientation);

  const setDevice = useCallback((d: DockDevice) => {
    setDeviceRaw(d);
    try { localStorage.setItem(DEVICE_KEY, d); } catch {}
  }, []);

  const setOrientation = useCallback((o: DockOrientation) => {
    setOrientationRaw(o);
    try { localStorage.setItem(ORIENTATION_KEY, o); } catch {}
  }, []);

  return { device, setDevice, orientation, setOrientation } as const;
}
