import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { getServiceCategory } from '@/utils/serviceCategorization';

export interface CategoryMixEntry {
  category: string;
  revenue: number;
  transactionCount: number;
  sharePercent: number;
}

interface CategoryMixFilters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useCategoryMixReport(filters: CategoryMixFilters) {
  return useQuery({
    queryKey: ['category-mix-report', filters],
    queryFn: async (): Promise<CategoryMixEntry[]> => {
      const rows = await fetchAllBatched<{
        item_name: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        item_type: string;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('item_name, total_amount, tax_amount, item_type')
          .gte('transaction_date', filters.dateFrom)
          .lte('transaction_date', filters.dateTo)
          .eq('item_type', 'service')
          .range(from, to);

        if (filters.locationId) {
          q = q.eq('location_id', filters.locationId);
        }
        return q;
      });

      const catMap = new Map<string, { revenue: number; count: number }>();
      let totalRevenue = 0;

      for (const row of rows) {
        const revenue = Number(row.total_amount) || 0;
        const category = getServiceCategory(row.item_name);
        totalRevenue += revenue;

        const entry = catMap.get(category) || { revenue: 0, count: 0 };
        entry.revenue += revenue;
        entry.count += 1;
        catMap.set(category, entry);
      }

      return Array.from(catMap.entries())
        .map(([category, v]) => ({
          category,
          revenue: v.revenue,
          transactionCount: v.count,
          sharePercent: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    staleTime: 2 * 60_000,
  });
}
