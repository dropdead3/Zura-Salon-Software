import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

/**
 * useStylistRebookRate — Per-stylist rebook conversion rate over a date window.
 *
 * Honors the visibility contract: returns `null` when the sample size is below
 * the materiality threshold (10 completed appointments) so we never coach off
 * noise. Mirrors useRebookingRate.ts but groups by `stylist_user_id`.
 */
export interface StylistRebookRateResult {
  staffId: string;
  completed: number;
  rebooked: number;
  rebookRate: number;
  /** Org-wide rebook rate over the same window for delta comparison. */
  orgRebookRate: number;
  /** Difference vs org average in percentage points (negative = lagging). */
  deltaVsOrg: number;
}

const SAMPLE_SIZE_FLOOR = 10;

export function useStylistRebookRate(
  stylistUserId: string | null | undefined,
  dateFrom: string,
  dateTo: string,
  locationId?: string,
) {
  return useQuery({
    queryKey: ['stylist-rebook-rate', stylistUserId, dateFrom, dateTo, locationId],
    queryFn: async (): Promise<StylistRebookRateResult | null> => {
      if (!stylistUserId) return null;

      const rows = await fetchAllBatched<{
        stylist_user_id: string | null;
        rebooked_at_checkout: boolean | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('stylist_user_id, rebooked_at_checkout')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('status', 'completed')
          .eq('is_demo', false)
          .range(from, to);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      // Org-wide totals across the window (denominator for delta comparison)
      const orgCompleted = rows.length;
      const orgRebooked = rows.filter((r) => r.rebooked_at_checkout).length;
      const orgRebookRate = orgCompleted > 0 ? (orgRebooked / orgCompleted) * 100 : 0;

      // Per-stylist
      const stylistRows = rows.filter((r) => String(r.stylist_user_id) === String(stylistUserId));
      const completed = stylistRows.length;

      // Visibility contract: insufficient sample → suppress signal
      if (completed < SAMPLE_SIZE_FLOOR) return null;

      const rebooked = stylistRows.filter((r) => r.rebooked_at_checkout).length;
      const rebookRate = (rebooked / completed) * 100;

      return {
        staffId: stylistUserId,
        completed,
        rebooked,
        rebookRate,
        orgRebookRate,
        deltaVsOrg: rebookRate - orgRebookRate,
      };
    },
    enabled: !!stylistUserId && !!dateFrom && !!dateTo,
    staleTime: 1000 * 60 * 5,
  });
}
