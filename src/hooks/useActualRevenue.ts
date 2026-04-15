import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';

/** Apply location filter directly to avoid deep type instantiation with generics. */
function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

interface ActualRevenueData {
  actualRevenue: number;
  actualServiceRevenue: number;
  actualProductRevenue: number;
  actualTransactions: number;
  hasActualData: boolean;
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

/**
 * Canonical POS revenue hook for any date range.
 * Uses raw transaction items as the source of truth so partially populated
 * daily summary tables cannot undercount multi-day ranges.
 * Supports location filtering and batch fetching for >1000 rows.
 */
export function useActualRevenue(dateFrom: string, dateTo: string, enabled: boolean, locationId?: string) {
  return useQuery<ActualRevenueData>({
    queryKey: ['actual-revenue', dateFrom, dateTo, locationId ?? 'all'],
    queryFn: async () => {
      const txnData = await fetchAllBatched<{
        item_type: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        phorest_client_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('item_type, total_amount, tax_amount, external_client_id')
          .gte('transaction_date', `${dateFrom}T00:00:00`)
          .lte('transaction_date', `${dateTo}T23:59:59`)
          .range(from, to);
        q = addLocationFilter(q, locationId);
        return q;
      });

      if (!txnData || txnData.length === 0) {
        return {
          actualRevenue: 0,
          actualServiceRevenue: 0,
          actualProductRevenue: 0,
          actualTransactions: 0,
          hasActualData: false,
        };
      }

      let serviceRevenue = 0;
      let productRevenue = 0;
      const clientIds = new Set<string>();

      const SERVICE_TYPES = new Set(['service', 'sale_fee', 'special_offer_item']);

      for (const row of txnData) {
        const amount = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
        const itemType = (row.item_type || '').toLowerCase();

        if (SERVICE_TYPES.has(itemType)) {
          serviceRevenue += amount;
        } else {
          productRevenue += amount;
        }

        if (row.external_client_id) clientIds.add(row.external_client_id);
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
