import { createContext, useContext, type ReactNode } from 'react';

/**
 * Provides the effective timezone for the currently-selected location
 * so that useOrgNow and other consumers can resolve it without prop drilling.
 *
 * Value is null when no location-specific override exists (fall back to org default).
 */
const LocationTimezoneContext = createContext<string | null>(null);

export function LocationTimezoneProvider({
  timezone,
  children,
}: {
  timezone: string | null;
  children: ReactNode;
}) {
  return (
    <LocationTimezoneContext.Provider value={timezone}>
      {children}
    </LocationTimezoneContext.Provider>
  );
}

export function useLocationTimezoneContext(): string | null {
  return useContext(LocationTimezoneContext);
}
