/**
 * useColorBarEntitlementCounts — Aggregate per-org entitlement counts.
 *
 * Performance: replaces a row-by-row scan of `backroom_location_entitlements`
 * (O(locations × orgs)) with a single grouped RPC call (O(orgs)).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EntitlementCountRow {
  total: number;
  active: number;
  suspended: number;
}

export function useColorBarEntitlementCounts() {
  return useQuery({
    queryKey: ['color-bar-entitlement-counts'],
    queryFn: async (): Promise<Map<string, EntitlementCountRow>> => {
      const { data, error } = await (supabase as any).rpc(
        'get_color_bar_entitlement_counts'
      );
      if (error) throw error;

      const map = new Map<string, EntitlementCountRow>();
      for (const row of (data ?? []) as any[]) {
        map.set(row.organization_id, {
          total: row.total_count ?? 0,
          active: row.active_count ?? 0,
          suspended: row.suspended_count ?? 0,
        });
      }
      return map;
    },
    staleTime: 30_000,
  });
}
