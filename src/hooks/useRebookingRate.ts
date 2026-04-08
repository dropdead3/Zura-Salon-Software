import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RebookingRateResult {
  completed: number;
  rebooked: number;
  rebookRate: number;
}

/**
 * Rebooking rate for a date range: completed appointments and how many rebooked at checkout.
 * Shared by RebookingCard and useQuickStats for consistent cache key and logic.
 */
const PAGE_SIZE = 1000;

export function useRebookingRate(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['rebooking-rate', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<RebookingRateResult> => {
      const buildLocationFilter = (q: any) => {
        if (locationId && locationId !== 'all') {
          const ids = locationId.split(',').filter(Boolean);
          if (ids.length === 1) return q.eq('location_id', ids[0]);
          if (ids.length > 1) return q.in('location_id', ids);
        }
        return q;
      };

      // Paginated fetch to avoid 1,000-row default limit
      const allRows: any[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        let q = supabase
          .from('v_all_appointments')
          .select('rebooked_at_checkout, status')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('status', 'completed')
          .eq('is_demo', false)
          .range(offset, offset + PAGE_SIZE - 1);
        q = buildLocationFilter(q);
        const { data, error } = await q;
        if (error) throw error;
        allRows.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      const completed = allRows.length;
      const rebooked = allRows.filter((r) => r.rebooked_at_checkout).length;
      const rebookRate = completed > 0 ? (rebooked / completed) * 100 : 0;
      return { completed, rebooked, rebookRate };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
