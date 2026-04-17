import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useOrgActiveCallbacks } from '@/hooks/useOrgActiveCallbackCounts';
import type { ClientCallback } from '@/hooks/useClientCallbacks';

interface CallbackLookupValue {
  getCallbacks: (clientId: string | null | undefined) => ClientCallback[];
  getCount: (clientId: string | null | undefined) => number;
  isLoaded: boolean;
}

const CallbackLookupContext = createContext<CallbackLookupValue | null>(null);

interface CallbackLookupProviderProps {
  orgId: string | null | undefined;
  children: ReactNode;
}

/**
 * Single org-wide callback fetch — feeds CallbackChip across the schedule grid
 * to avoid N+1 (per-card) queries. Falls back gracefully: components that read
 * via useCallbackLookup() outside a provider will get null and can fall back
 * to per-client hooks.
 */
export function CallbackLookupProvider({ orgId, children }: CallbackLookupProviderProps) {
  const { data: lookup } = useOrgActiveCallbacks(orgId);

  const value = useMemo<CallbackLookupValue>(
    () => ({
      getCallbacks: (clientId) => (clientId ? lookup?.get(clientId) ?? [] : []),
      getCount: (clientId) => (clientId ? lookup?.get(clientId)?.length ?? 0 : 0),
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
