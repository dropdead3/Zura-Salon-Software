/**
 * DockDemoContext — Enables demo mode when staff.userId === 'dev-bypass-000'.
 * Data hooks check this context to return mock data instead of querying the database.
 */

import { createContext, useContext, useMemo } from 'react';
import type { DockStaffSession } from '@/pages/Dock';

interface DockDemoContextValue {
  isDemoMode: boolean;
}

const DockDemoContext = createContext<DockDemoContextValue>({ isDemoMode: false });

export function DockDemoProvider({
  staff,
  children,
}: {
  staff: DockStaffSession;
  children: React.ReactNode;
}) {
  const value = useMemo<DockDemoContextValue>(
    () => ({ isDemoMode: staff.userId === 'dev-bypass-000' }),
    [staff.userId]
  );

  return <DockDemoContext.Provider value={value}>{children}</DockDemoContext.Provider>;
}

export function useDockDemo() {
  return useContext(DockDemoContext);
}
