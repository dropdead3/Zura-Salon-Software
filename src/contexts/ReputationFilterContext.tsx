/**
 * ReputationFilterContext — header-level location scope for the Online
 * Reputation hub. Hooks default to org-wide ('all'); components inside the
 * provider call useReputationFilter() and pass locationId into their data
 * hooks so React Query caches per-location.
 */
import { createContext, useContext, type ReactNode } from 'react';

export interface ReputationFilterValue {
  /** 'all' = aggregate org-wide; otherwise a location id. */
  locationId: string;
}

const ReputationFilterContext = createContext<ReputationFilterValue>({ locationId: 'all' });

export function ReputationFilterProvider({
  locationId,
  children,
}: ReputationFilterValue & { children: ReactNode }) {
  return (
    <ReputationFilterContext.Provider value={{ locationId }}>
      {children}
    </ReputationFilterContext.Provider>
  );
}

export function useReputationFilter(): ReputationFilterValue {
  return useContext(ReputationFilterContext);
}

/** Helper for query keys / DB filters: returns locationId or undefined when 'all'. */
export function reputationLocationFilter(locationId: string | undefined): string | undefined {
  return locationId && locationId !== 'all' ? locationId : undefined;
}
