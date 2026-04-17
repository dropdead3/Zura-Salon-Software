import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useOrgActiveCallbacks } from '@/hooks/useOrgActiveCallbackCounts';
import type { ClientCallback } from '@/hooks/useClientCallbacks';

interface CallbackLookupValue {
  /**
   * Returns ACTIVE (unacknowledged, non-stale) callbacks for a client key.
   * Empty array if none. Honors the `getHospitalityClientKey` resolver —
   * pass either a Phorest ID or a Zura UUID.
   */
  getActiveCallbacks: (clientKey: string | null | undefined) => ClientCallback[];
  /** Convenience: count of active callbacks (alias for getActiveCallbacks().length). */
  getCount: (clientKey: string | null | undefined) => number;
  isLoaded: boolean;
}

const CallbackLookupContext = createContext<CallbackLookupValue | null>(null);

interface CallbackLookupProviderProps {
  orgId: string | null | undefined;
  children: ReactNode;
}

/**
 * Single org-wide ACTIVE callback fetch — feeds CallbackChip and
 * ClientCallbacksPanel across the schedule grid to avoid N+1 (per-card)
 * queries. Falls back gracefully: components that read via useCallbackLookup()
 * outside a provider will get null and can fall back to per-client hooks.
 *
 * Active = unacknowledged AND not stale (90d). Archived/past callbacks remain
 * a per-client cold-path query (see ClientCallbacksPanel `archived` set).
 */
export function CallbackLookupProvider({ orgId, children }: CallbackLookupProviderProps) {
  const { data: lookup } = useOrgActiveCallbacks(orgId);

  const value = useMemo<CallbackLookupValue>(
    () => ({
      getActiveCallbacks: (clientKey) =>
        clientKey ? lookup?.get(clientKey) ?? [] : [],
      getCount: (clientKey) =>
        clientKey ? lookup?.get(clientKey)?.length ?? 0 : 0,
      isLoaded: !!lookup,
    }),
    [lookup],
  );

  return (
    <CallbackLookupContext.Provider value={value}>{children}</CallbackLookupContext.Provider>
  );
}

/**
 * Returns the lookup if a provider is mounted, else null. Callers should
 * fall back to per-client hooks (`useClientCallbacks`) when null.
 */
export function useCallbackLookup(): CallbackLookupValue | null {
  return useContext(CallbackLookupContext);
}
