import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct } from '@/utils/serviceCategorization';

/** Apply location filter. */
function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface ExtensionProductRevenueData {
  extensionProductRevenue: number;
  extensionProductCount: number;
}

/**
 * Fetches extension product revenue from phorest_transaction_items.
 * Identifies extension products by item_name pattern matching.
 */
export function useExtensionProductRevenue(
  dateFrom: string,
  dateTo: string,
  enabled: boolean,
  locationId?: string,
) {
  return useQuery<ExtensionProductRevenueData>({
    queryKey: ['extension-product-revenue', dateFrom, dateTo, locationId ?? 'all'],
    queryFn: async () => {
      const txDateFrom = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`;
      const txDateTo = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999`;

      const items = await fetchAllBatched<{
        item_name: string | null;
        total_amount: number | null;
        tax_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('item_name, total_amount, tax_amount')
          .gte('transaction_date', txDateFrom)
          .lte('transaction_date', txDateTo)
          .in('item_type', ['product', 'Product', 'retail', 'Retail', 'PRODUCT', 'RETAIL'])
          .range(from, to);
        q = addLocationFilter(q, locationId);
        return q;
      });

      let extensionRevenue = 0;
      let extensionCount = 0;

      for (const item of items) {
        if (isExtensionProduct(item.item_name)) {
          extensionRevenue += (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
          extensionCount += 1;
        }
      }

      return {
        extensionProductRevenue: extensionRevenue,
        extensionProductCount: extensionCount,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
