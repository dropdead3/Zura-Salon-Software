import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface DiscountEntry {
  stylistName: string;
  totalDiscounts: number;
  discountCount: number;
  totalRevenue: number;
  discountPercent: number;
}

export interface DiscountSummary {
  entries: DiscountEntry[];
  totalDiscountAmount: number;
  totalTransactions: number;
  avgDiscountPercent: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useDiscountsReport(filters: Filters) {
  return useQuery({
    queryKey: ['discounts-report', filters],
    queryFn: async (): Promise<DiscountSummary> => {
      const rows = await fetchAllBatched<{
        staff_name: string | null;
        discount: number | null;
        total_amount: number | null;
        transaction_date: string;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('staff_name, discount, total_amount, transaction_date')
          .gte('transaction_date', filters.dateFrom)
          .lte('transaction_date', filters.dateTo)
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      const staffMap = new Map<string, { discounts: number; count: number; revenue: number }>();

      for (const row of rows) {
        const name = row.staff_name || 'Unknown';
        const discount = Math.abs(Number(row.discount) || 0);
        const revenue = Number(row.total_amount) || 0;
        const entry = staffMap.get(name) || { discounts: 0, count: 0, revenue: 0 };
        entry.revenue += revenue;
        if (discount > 0) {
          entry.discounts += discount;
          entry.count += 1;
        }
        staffMap.set(name, entry);
      }

      let totalDiscountAmount = 0;
      let totalRevenue = 0;
      let totalTransactions = 0;

      const entries: DiscountEntry[] = Array.from(staffMap.entries())
        .map(([name, v]) => {
          totalDiscountAmount += v.discounts;
          totalRevenue += v.revenue;
          totalTransactions += v.count;
          return {
            stylistName: name,
            totalDiscounts: v.discounts,
            discountCount: v.count,
            totalRevenue: v.revenue,
            discountPercent: v.revenue > 0 ? (v.discounts / v.revenue) * 100 : 0,
          };
        })
        .filter(e => e.discountCount > 0)
        .sort((a, b) => b.totalDiscounts - a.totalDiscounts);

      return {
        entries,
        totalDiscountAmount,
        totalTransactions,
        avgDiscountPercent: totalRevenue > 0 ? (totalDiscountAmount / totalRevenue) * 100 : 0,
      };
    },
    staleTime: 2 * 60_000,
  });
}
