import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

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

      // Use phorest_transaction_items for accurate POS revenue
      let allItems: { total_amount: number | null; tax_amount: number | null }[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('phorest_transaction_items')
          .select('total_amount, tax_amount')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(offset, offset + PAGE_SIZE - 1);

        if (locationId && locationId !== 'all') {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        allItems.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return allItems.reduce(
        (sum, row) => sum + (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0),
        0
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}
