import { useQuery } from '@tanstack/react-query';
import { invokeTerminalAction } from '@/hooks/useStripeTerminals';
import { supabase } from '@/integrations/supabase/client';
import type { SplashOrigin } from '@/hooks/useTerminalSplashMetadata';

export interface LocationTerminalStatus {
  locationId: string;
  terminalLocationId: string | null;
  terminalDisplayName: string | null;
  splashOrigin: SplashOrigin | null;
  hasSplash: boolean;
}

/**
 * Fetches terminal location + splash metadata for every org location in one shot.
 * Cached for 60s so flipping between locations doesn't re-fetch.
 */
export function useAllLocationTerminalStatus(
  locationIds: string[],
  orgId: string | undefined,
) {
  return useQuery({
    queryKey: ['all-location-terminal-status', orgId, ...locationIds],
    queryFn: async (): Promise<Record<string, LocationTerminalStatus>> => {
      const results: Record<string, LocationTerminalStatus> = {};

      // 1. Fetch terminal locations for all org locations in parallel
      const terminalResults = await Promise.allSettled(
        locationIds.map(async (locId) => {
          const result = await invokeTerminalAction('list_locations', locId);
          const terminals = result?.data || [];
          return { locId, terminal: terminals[0] || null };
        }),
      );

      const terminalMap: Record<string, { id: string; display_name: string }> = {};
      for (const r of terminalResults) {
        if (r.status === 'fulfilled' && r.value.terminal) {
          terminalMap[r.value.locId] = r.value.terminal;
        }
      }

      // 2. Fetch splash metadata for locations that have terminals
      const locIdsWithTerminals = Object.keys(terminalMap);
      let metadataMap: Record<string, { splash_origin: string }> = {};

      if (orgId && locIdsWithTerminals.length > 0) {
        const terminalLocationIds = locIdsWithTerminals.map(l => terminalMap[l].id);
        const { data } = await supabase
          .from('terminal_splash_metadata')
          .select('location_id, terminal_location_id, splash_origin')
          .eq('organization_id', orgId)
          .in('terminal_location_id', terminalLocationIds);

        if (data) {
          for (const row of data) {
            metadataMap[row.terminal_location_id as string] = {
              splash_origin: row.splash_origin as string,
            };
          }
        }
      }

      // 3. Derive splash active from metadata presence (avoids N+1 Stripe calls)
      const splashActiveMap: Record<string, boolean> = {};
      for (const locId of locIdsWithTerminals) {
        const tid = terminalMap[locId].id;
        splashActiveMap[locId] = !!metadataMap[tid];
      }

      // 4. Build results
      for (const locId of locationIds) {
        const terminal = terminalMap[locId] || null;
        const tid = terminal?.id || null;
        const meta = tid ? metadataMap[tid] : null;

        results[locId] = {
          locationId: locId,
          terminalLocationId: tid,
          terminalDisplayName: terminal?.display_name || null,
          splashOrigin: (meta?.splash_origin as SplashOrigin) || null,
          hasSplash: splashActiveMap[locId] ?? false,
        };
      }

      return results;
    },
    enabled: !!orgId && locationIds.length > 0,
    staleTime: 60000,
  });
}
