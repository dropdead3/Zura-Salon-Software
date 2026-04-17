import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isCallbackStale } from '@/lib/callback-utils';
import type { ClientCallback } from '@/hooks/useClientCallbacks';

/**
 * Returns a Map<phorest_client_id, ClientCallback[]> of active (unacknowledged,
 * non-stale) callbacks for an entire organization. Single query — designed for
 * directory pages and the schedule grid so we avoid N+1.
 *
 * FILTER: trigger_date < now() - 90d hidden as stale (alert-fatigue).
 */
export function useOrgActiveCallbacks(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['org-active-callbacks', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, ClientCallback[]>> => {
      // Scale guard: cap payload at 2k rows. An org with thousands of
      // unacknowledged callbacks would payload-bomb every schedule mount —
      // see `high-concurrency-scalability` doctrine.
      const CAP = 2000;
      const { data, error } = await supabase
        .from('client_callbacks')
        .select('*')
        .eq('organization_id', orgId!)
        .is('acknowledged_at', null)
        .limit(CAP);

      if (error) throw error;

      if (data?.length === CAP) {
        console.warn(
          `[CallbackLookup] hit ${CAP}-row cap for org ${orgId}. Some active callbacks may be missing — consider archiving stale follow-ups.`,
        );
      }

      const map = new Map<string, ClientCallback[]>();
      for (const row of (data ?? []) as ClientCallback[]) {
        if (isCallbackStale(row)) continue;
        const list = map.get(row.client_id) ?? [];
        list.push(row);
        map.set(row.client_id, list);
      }
      return map;
    },
  });
}

/**
 * Convenience wrapper for callers that only need counts (e.g. directory chip).
 * Re-derives a Map<clientId, count> from the full row payload.
 */
export function useOrgActiveCallbackCounts(orgId: string | null | undefined) {
  const query = useOrgActiveCallbacks(orgId);
  return {
    ...query,
    data: query.data
      ? new Map(Array.from(query.data.entries()).map(([k, v]) => [k, v.length]))
      : undefined,
  };
}
