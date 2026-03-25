/**
 * DockScaleProvider — Wraps the Dock tree with shared scale context.
 * Creates the adapter once and provides live weight state to all consumers.
 */

import { useMemo } from 'react';
import { DockScaleContext, useDockScaleState } from '@/hooks/dock/useDockScale';
import { useDockDemo } from '@/contexts/DockDemoContext';

export function DockScaleProvider({ children }: { children: React.ReactNode }) {
  const { isDemoMode } = useDockDemo();
  const scaleState = useDockScaleState(isDemoMode);

  const value = useMemo(() => scaleState, [
    scaleState.liveWeight,
    scaleState.unit,
    scaleState.isConnected,
    scaleState.isStable,
    scaleState.connectionState,
    scaleState.deviceName,
    scaleState.mode,
    scaleState.bleError,
    scaleState.isConnecting,
    scaleState.isDemoSimulating,
  ]);

  return (
    <DockScaleContext.Provider value={value}>
      {children}
    </DockScaleContext.Provider>
  );
}
