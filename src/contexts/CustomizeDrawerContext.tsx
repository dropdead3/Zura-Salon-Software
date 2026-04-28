/**
 * CustomizeDrawerContext
 *
 * Lifts the open/close state of the Dashboard Customize drawer out of
 * `DashboardCustomizeMenu` so that other surfaces — notably the Role
 * Dashboards configurator in Settings — can trigger it programmatically
 * after wiring up the desired role context (via View As).
 *
 * The drawer remains mounted inside `DashboardLayout` (via the existing
 * `DashboardCustomizeMenu`); only its `isOpen` flag is hoisted here.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface CustomizeDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

const CustomizeDrawerContext = createContext<CustomizeDrawerContextType | undefined>(undefined);

export function CustomizeDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, open, close, setOpen: setIsOpen }),
    [isOpen, open, close],
  );

  return (
    <CustomizeDrawerContext.Provider value={value}>
      {children}
    </CustomizeDrawerContext.Provider>
  );
}

/**
 * Read/control the Customize drawer. Safe to call outside the provider —
 * returns a no-op shape so non-dashboard surfaces don't crash.
 */
export function useCustomizeDrawer(): CustomizeDrawerContextType {
  const ctx = useContext(CustomizeDrawerContext);
  if (!ctx) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      setOpen: () => {},
    };
  }
  return ctx;
}
