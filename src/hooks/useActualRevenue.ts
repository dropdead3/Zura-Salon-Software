import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActualRevenueData {
  actualRevenue: number;
  actualServiceRevenue: number;
  actualProductRevenue: number;
  actualTransactions: number;
  hasActualData: boolean;
}

/**
 * Generalized POS revenue hook for any date range.
 * Queries phorest_daily_sales_summary with fallback to phorest_transaction_items.
 */
export function useActualRevenue(dateFrom: string, dateTo: string, enabled: boolean) {
  return useQuery<ActualRevenueData>({
    queryKey: ['actual-revenue', dateFrom, dateTo],
    queryFn: async () => {
      // Primary: daily sales summary
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('total_revenue, service_revenue, product_revenue, total_transactions')
        .gte('summary_date', dateFrom)
        .lte('summary_date', dateTo);

      if (error) throw error;

      if (data && data.length > 0) {
        const totals = data.reduce(
          (acc, row) => ({
            totalRevenue: acc.totalRevenue + (Number(row.total_revenue) || 0),
            serviceRevenue: acc.serviceRevenue + (Number(row.service_revenue) || 0),
            productRevenue: acc.productRevenue + (Number(row.product_revenue) || 0),
            totalTransactions: acc.totalTransactions + (Number(row.total_transactions) || 0),
          }),
          { totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalTransactions: 0 }
        );
        return {
          actualRevenue: totals.totalRevenue,
          actualServiceRevenue: totals.serviceRevenue,
          actualProductRevenue: totals.productRevenue,
          actualTransactions: totals.totalTransactions,
          hasActualData: totals.totalRevenue > 0,
        };
      }

      // Fallback: raw transaction items
      const { data: txnData, error: txnError } = await supabase
        .from('phorest_transaction_items')
        .select('item_type, total_amount, tax_amount, phorest_client_id')
        .gte('transaction_date', `${dateFrom}T00:00:00`)
        .lte('transaction_date', `${dateTo}T23:59:59`);

      if (txnError) throw txnError;

      if (!txnData || txnData.length === 0) {
        return { actualRevenue: 0, actualServiceRevenue: 0, actualProductRevenue: 0, actualTransactions: 0, hasActualData: false };
      }

      let serviceRevenue = 0;
      let productRevenue = 0;
      const clientIds = new Set<string>();

      for (const row of txnData) {
        const amount = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
        if (row.item_type === 'service') {
          serviceRevenue += amount;
        } else {
          productRevenue += amount;
        }
        if (row.phorest_client_id) clientIds.add(row.phorest_client_id);
      }

      const totalRevenue = serviceRevenue + productRevenue;
      return {
        actualRevenue: totalRevenue,
        actualServiceRevenue: serviceRevenue,
        actualProductRevenue: productRevenue,
        actualTransactions: clientIds.size,
        hasActualData: totalRevenue > 0,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
