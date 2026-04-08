import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface TaxSummaryData {
  totalTax: number;
  totalPreTaxRevenue: number;
  totalGrossRevenue: number;
  byItemType: { itemType: string; tax: number; revenue: number }[];
  byLocation: { locationId: string; locationName: string; tax: number; revenue: number }[];
  byMonth: { month: string; tax: number; revenue: number }[];
}

interface TaxSummaryFilters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useTaxSummary(filters: TaxSummaryFilters) {
  return useQuery({
    queryKey: ['tax-summary', filters],
    queryFn: async (): Promise<TaxSummaryData> => {
      const rows = await fetchAllBatched<{
        total_amount: number | null;
        tax_amount: number | null;
        item_type: string;
        location_id: string | null;
        branch_name: string | null;
        transaction_date: string;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('total_amount, tax_amount, item_type, location_id, branch_name, transaction_date')
          .gte('transaction_date', filters.dateFrom)
          .lte('transaction_date', filters.dateTo)
          .range(from, to);

        if (filters.locationId) {
          q = q.eq('location_id', filters.locationId);
        }
        return q;
      });

      let totalTax = 0;
      let totalPreTaxRevenue = 0;

      const typeMap = new Map<string, { tax: number; revenue: number }>();
      const locMap = new Map<string, { name: string; tax: number; revenue: number }>();
      const monthMap = new Map<string, { tax: number; revenue: number }>();

      for (const row of rows) {
        const tax = Number(row.tax_amount) || 0;
        const amount = Number(row.total_amount) || 0;
        totalTax += tax;
        totalPreTaxRevenue += amount;

        // By item type
        const itemType = (row.item_type || 'unknown').toLowerCase();
        const typeEntry = typeMap.get(itemType) || { tax: 0, revenue: 0 };
        typeEntry.tax += tax;
        typeEntry.revenue += amount;
        typeMap.set(itemType, typeEntry);

        // By location
        const locId = row.location_id || 'unknown';
        const locEntry = locMap.get(locId) || { name: row.branch_name || 'Unknown', tax: 0, revenue: 0 };
        locEntry.tax += tax;
        locEntry.revenue += amount;
        locMap.set(locId, locEntry);

        // By month
        const month = row.transaction_date?.substring(0, 7) || 'unknown';
        const monthEntry = monthMap.get(month) || { tax: 0, revenue: 0 };
        monthEntry.tax += tax;
        monthEntry.revenue += amount;
        monthMap.set(month, monthEntry);
      }

      return {
        totalTax,
        totalPreTaxRevenue,
        totalGrossRevenue: totalPreTaxRevenue + totalTax,
        byItemType: Array.from(typeMap.entries())
          .map(([itemType, v]) => ({ itemType, ...v }))
          .filter(e => e.tax > 0)
          .sort((a, b) => b.tax - a.tax),
        byLocation: Array.from(locMap.entries())
          .map(([locationId, v]) => ({ locationId, locationName: v.name, ...v }))
          .filter(e => e.tax > 0)
          .sort((a, b) => b.tax - a.tax),
        byMonth: Array.from(monthMap.entries())
          .map(([month, v]) => ({ month, ...v }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
