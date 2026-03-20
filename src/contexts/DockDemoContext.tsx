/**
 * DockDemoContext — Enables demo mode when staff.userId === 'dev-bypass-000'.
 * Also provides device preview state for demo mode.
 */

import { createContext, useContext, useMemo } from 'react';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockDevicePreview, type DockDevice, type DockOrientation } from '@/hooks/dock/useDockDevicePreview';

interface DockDemoContextValue {
  isDemoMode: boolean;
  device: DockDevice;
  setDevice: (d: DockDevice) => void;
  orientation: DockOrientation;
  setOrientation: (o: DockOrientation) => void;
}

const DockDemoContext = createContext<DockDemoContextValue>({
  isDemoMode: false,
  device: 'full',
  setDevice: () => {},
  orientation: 'portrait',
  setOrientation: () => {},
});

export function DockDemoProvider({
  staff,
  children,
}: {
  staff: DockStaffSession;
  children: React.ReactNode;
}) {
  const isDemoMode = staff.userId === 'dev-bypass-000';
  const { device, setDevice, orientation, setOrientation } = useDockDevicePreview();

  const value = useMemo<DockDemoContextValue>(
    () => ({
      isDemoMode,
      device: isDemoMode ? device : 'full',
      setDevice,
      orientation,
      setOrientation,
    }),
    [isDemoMode, device, setDevice, orientation, setOrientation]
  );

  return <DockDemoContext.Provider value={value}>{children}</DockDemoContext.Provider>;
}

export function useDockDemo() {
  return useContext(DockDemoContext);
}
