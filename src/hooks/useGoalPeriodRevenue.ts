import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

type GoalPeriod = 'weekly' | 'monthly' | 'yearly';

function getPeriodStart(period: GoalPeriod): Date {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return startOfWeek(now, { weekStartsOn: 1 });
    case 'monthly':
      return startOfMonth(now);
    case 'yearly':
      return startOfYear(now);
  }
}

export function useGoalPeriodRevenue(period: GoalPeriod, locationId?: string) {
  return useQuery({
    queryKey: ['goal-period-revenue', period, locationId],
    queryFn: async () => {
      const dateFrom = format(getPeriodStart(period), 'yyyy-MM-dd');
      const dateTo = format(new Date(), 'yyyy-MM-dd');

      const allItems = await fetchAllBatched<{ total_amount: number | null; tax_amount: number | null }>(
        (from, to) => {
          let q = supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount')
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo)
            .range(from, to);

          if (locationId && locationId !== 'all') {
            q = q.eq('location_id', locationId);
          }
          return q;
        }
      );

      return allItems.reduce(
        (sum, row) => sum + (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0),
        0
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}
