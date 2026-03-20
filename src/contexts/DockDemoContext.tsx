/**
 * DockDemoContext — Enables demo mode when staff.userId === 'dev-bypass-000'.
 * Also provides device preview state and organization scoping for demo mode.
 * `usesRealData` signals that the demo should fetch real services/clients from DB.
 */

import { createContext, useContext, useMemo } from 'react';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockDevicePreview, type DockDevice, type DockOrientation } from '@/hooks/dock/useDockDevicePreview';

interface DockDemoContextValue {
  isDemoMode: boolean;
  usesRealData: boolean;
  organizationId: string;
  device: DockDevice;
  setDevice: (d: DockDevice) => void;
  orientation: DockOrientation;
  setOrientation: (o: DockOrientation) => void;
}

const DockDemoContext = createContext<DockDemoContextValue>({
  isDemoMode: false,
  usesRealData: false,
  organizationId: '',
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
  const usesRealData = isDemoMode && !!staff.organizationId && staff.organizationId !== 'demo-org-000';
  const { device, setDevice, orientation, setOrientation } = useDockDevicePreview();

  const value = useMemo<DockDemoContextValue>(
    () => ({
      isDemoMode,
      usesRealData,
      organizationId: staff.organizationId,
      device,
      setDevice,
      orientation,
      setOrientation,
    }),
    [isDemoMode, usesRealData, staff.organizationId, device, setDevice, orientation, setOrientation]
  );

  return <DockDemoContext.Provider value={value}>{children}</DockDemoContext.Provider>;
}

export function useDockDemo() {
  return useContext(DockDemoContext);
}
