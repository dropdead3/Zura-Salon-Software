import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE_DAYS = 90;

/**
 * Returns a Map<phorest_client_id, count> of active (unacknowledged, non-stale)
 * callbacks for an entire organization. Single query — designed for directory
 * pages so we avoid N+1.
 *
 * Stale = trigger_date older than 90 days (matches per-client hook filter).
 */
export function useOrgActiveCallbackCounts(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['org-active-callback-counts', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('client_callbacks')
        .select('client_id, trigger_date')
        .eq('organization_id', orgId!)
        .is('acknowledged_at', null);

      if (error) throw error;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - STALE_DAYS);

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        // Apply same stale filter as per-client hook
        if (row.trigger_date && new Date(row.trigger_date) < cutoff) continue;
        counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
      }
      return counts;
    },
  });
}
