import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RevenueGapAnalysis {
  expectedRevenue: number;
  actualRevenue: number;
  gapAmount: number;
  gapPercent: number;
  cancellations: { count: number; lostRevenue: number };
  noShows: { count: number; lostRevenue: number };
  unexplainedGap: number;
}

/**
 * Gap analysis hook: fetches cancellation/no-show data for a date range
 * and computes the revenue gap breakdown.
 */
export function useRevenueGapAnalysis(
  dateFrom: string,
  dateTo: string,
  expectedRevenue: number,
  actualRevenue: number,
  enabled: boolean
) {
  return useQuery<RevenueGapAnalysis>({
    queryKey: ['revenue-gap-analysis', dateFrom, dateTo],
    queryFn: async () => {
      // Fetch cancelled appointments
      const { data: cancelledData, error: cancelledError } = await supabase
        .from('phorest_appointments')
        .select('id, total_price')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .eq('status', 'cancelled');

      if (cancelledError) throw cancelledError;

      // Fetch no-show appointments
      const { data: noShowData, error: noShowError } = await supabase
        .from('phorest_appointments')
        .select('id, total_price')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .eq('status', 'no_show');

      if (noShowError) throw noShowError;

      const cancellations = {
        count: cancelledData?.length ?? 0,
        lostRevenue: (cancelledData ?? []).reduce((sum, a) => sum + (Number(a.total_price) || 0), 0),
      };

      const noShows = {
        count: noShowData?.length ?? 0,
        lostRevenue: (noShowData ?? []).reduce((sum, a) => sum + (Number(a.total_price) || 0), 0),
      };

      const gapAmount = expectedRevenue - actualRevenue;
      const gapPercent = expectedRevenue > 0 ? (gapAmount / expectedRevenue) * 100 : 0;
      const explainedGap = cancellations.lostRevenue + noShows.lostRevenue;
      const unexplainedGap = Math.max(0, gapAmount - explainedGap);

      return {
        expectedRevenue,
        actualRevenue,
        gapAmount,
        gapPercent,
        cancellations,
        noShows,
        unexplainedGap,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
