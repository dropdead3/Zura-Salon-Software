import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

interface RealizationRateResult {
  realizationRate: number | undefined;
  dataPoints: number;
  isLoading: boolean;
}

/**
 * Lightweight hook that computes the 30-day realization rate
 * by comparing scheduled appointment revenue to actual POS revenue.
 *
 * Returns an integer percentage (e.g. 87) clamped to [70, 100],
 * or undefined if insufficient data.
 */
export function useRealizationRate(locationId?: string): RealizationRateResult {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['realization-rate', orgId, locationId],
    queryFn: async () => {
      if (!orgId) return { rate: undefined, points: 0 };

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
      const toDate = now.toISOString().slice(0, 10);

      // 1. Scheduled revenue by date from phorest_appointments (tip-adjusted, paginated)
      const apptData = await fetchAllBatched<{
        appointment_date: string | null;
        total_price: number | null;
        tip_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('appointment_date, total_price, tip_amount')
          .gte('appointment_date', fromDate)
          .lte('appointment_date', toDate)
          .neq('status', 'cancelled')
          .range(from, to);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const scheduledByDate: Record<string, number> = {};
      for (const row of apptData) {
        const d = row.appointment_date;
        if (!d) continue;
        scheduledByDate[d] = (scheduledByDate[d] || 0) + ((Number(row.total_price) || 0) - (Number(row.tip_amount) || 0));
      }

      // 2. Actual revenue by date from phorest_transaction_items
      const salesData = await fetchAllBatched<{
        transaction_date: string | null;
        total_amount: number | null;
        tax_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('transaction_date, total_amount, tax_amount')
          .gte('transaction_date', fromDate)
          .lte('transaction_date', toDate)
          .range(from, to);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const actualByDate: Record<string, number> = {};
      for (const row of salesData) {
        const d = (row.transaction_date || '').slice(0, 10);
        if (!d) continue;
        actualByDate[d] = (actualByDate[d] || 0) + (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
      }

      // 3. Compute daily ratios for dates where both exist and scheduled > 0
      const ratios: number[] = [];
      for (const date of Object.keys(scheduledByDate)) {
        const scheduled = scheduledByDate[date];
        const actual = actualByDate[date];
        if (scheduled > 0 && actual != null && actual > 0) {
          ratios.push(actual / scheduled);
        }
      }

      if (ratios.length < 3) {
        return { rate: undefined, points: ratios.length };
      }

      const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
      const clamped = Math.min(1.0, Math.max(0.70, avg));
      return { rate: Math.round(clamped * 100), points: ratios.length };
    },
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    realizationRate: data?.rate,
    dataPoints: data?.points ?? 0,
    isLoading,
  };
}
