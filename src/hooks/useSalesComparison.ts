import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface ComparisonData {
  current: {
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalTransactions: number;
    averageTicket: number;
  };
  previous: {
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalTransactions: number;
    averageTicket: number;
  };
  percentChange: {
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalTransactions: number;
    averageTicket: number;
  };
}

async function fetchPeriodRevenue(dateFrom: string, dateTo: string, locationId?: string) {
  const allData: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    let q: any = supabase
      .from('phorest_transaction_items')
      .select('total_amount, tax_amount, item_type, phorest_client_id, transaction_date')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo);
    if (locationId) q = q.eq('location_id', locationId);
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) throw error;
    allData.push(...(data || []));
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }

  let totalRevenue = 0, serviceRevenue = 0, productRevenue = 0;
  const clientDates = new Set<string>();
  for (const item of allData) {
    const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
    totalRevenue += amount;
    if (item.item_type === 'service') serviceRevenue += amount;
    else productRevenue += amount;
    if (item.phorest_client_id) {
      const date = (item.transaction_date || '').slice(0, 10);
      clientDates.add(`${item.phorest_client_id}|${date}`);
    }
  }
  const totalTransactions = clientDates.size || allData.length;
  return { totalRevenue, serviceRevenue, productRevenue, totalTransactions };
}

export function useSalesComparison(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['sales-comparison', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<ComparisonData> => {
      const currentFrom = new Date(dateFrom);
      const currentTo = new Date(dateTo);
      const daysDiff = Math.ceil((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24));
      
      const previousTo = subDays(currentFrom, 1);
      const previousFrom = subDays(previousTo, daysDiff);

      const [current, previous] = await Promise.all([
        fetchPeriodRevenue(dateFrom, dateTo, locationId),
        fetchPeriodRevenue(format(previousFrom, 'yyyy-MM-dd'), format(previousTo, 'yyyy-MM-dd'), locationId),
      ]);

      const currentAvgTicket = current.totalTransactions > 0 
        ? current.totalRevenue / current.totalTransactions : 0;
      const previousAvgTicket = previous.totalTransactions > 0 
        ? previous.totalRevenue / previous.totalTransactions : 0;

      const calcChange = (curr: number, prev: number) => 
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

      return {
        current: { ...current, averageTicket: currentAvgTicket },
        previous: { ...previous, averageTicket: previousAvgTicket },
        percentChange: {
          totalRevenue: calcChange(current.totalRevenue, previous.totalRevenue),
          serviceRevenue: calcChange(current.serviceRevenue, previous.serviceRevenue),
          productRevenue: calcChange(current.productRevenue, previous.productRevenue),
          totalTransactions: calcChange(current.totalTransactions, previous.totalTransactions),
          averageTicket: calcChange(currentAvgTicket, previousAvgTicket),
        },
      };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
