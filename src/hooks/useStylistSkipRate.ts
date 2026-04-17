import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

/**
 * useStylistSkipRate — Per-stylist rebook-skip rate over a 30-day window.
 *
 * Mirrors the visibility contract of useStylistRebookRate: returns `null`
 * when sample size is below the materiality threshold (10 completed
 * appointments) so we never coach off noise.
 *
 * Numerator: completed appointments by this stylist that have a row in
 *   `rebook_decline_reasons` (any reason except blank).
 * Denominator: completed appointments by this stylist in the window.
 *
 * `isElevated` flips at >= 40% — used to gate inline coaching nudges
 * inside the checkout sheet.
 */
export interface StylistSkipRateResult {
  staffId: string;
  completed: number;
  skipped: number;
  skipRate: number;
  isElevated: boolean;
}

const SAMPLE_SIZE_FLOOR = 10;
const ELEVATED_THRESHOLD = 40;

export function useStylistSkipRate(
  stylistUserId: string | null | undefined,
  locationId?: string | null,
) {
  const dateTo = format(new Date(), 'yyyy-MM-dd');
  const dateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['stylist-skip-rate', stylistUserId, dateFrom, dateTo, locationId ?? 'all'],
    queryFn: async (): Promise<StylistSkipRateResult | null> => {
      if (!stylistUserId) return null;

      // Fetch completed appointments for this stylist in the window
      const completedRows = await fetchAllBatched<{
        id: string;
        stylist_user_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('id, stylist_user_id')
          .eq('stylist_user_id', stylistUserId)
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('status', 'completed')
          .eq('is_demo', false)
          .range(from, to);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const completed = completedRows.length;
      if (completed < SAMPLE_SIZE_FLOOR) {
        if (import.meta.env.DEV) {
          console.debug(
            `[useStylistSkipRate] suppressed: ${completed} < ${SAMPLE_SIZE_FLOOR} sample floor`,
          );
        }
        return null;
      }

      const completedIds = completedRows.map((r) => r.id);

      // Fetch decline-reason rows scoped to those appointments
      const { data: declineRows, error } = await supabase
        .from('rebook_decline_reasons' as any)
        .select('appointment_id')
        .in('appointment_id', completedIds);

      if (error) throw error;

      const skippedSet = new Set(
        (declineRows || [])
          .map((r: any) => r.appointment_id as string | null)
          .filter((id: string | null): id is string => !!id),
      );
      const skipped = skippedSet.size;
      const skipRate = (skipped / completed) * 100;

      return {
        staffId: stylistUserId,
        completed,
        skipped,
        skipRate,
        isElevated: skipRate >= ELEVATED_THRESHOLD,
      };
    },
    enabled: !!stylistUserId,
    staleTime: 1000 * 60 * 5,
  });
}
