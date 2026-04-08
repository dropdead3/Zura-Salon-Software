import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct, isGiftCardProduct, isMerchProduct } from '@/utils/serviceCategorization';

/** Apply location filter. */
function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface RetailBreakdownData {
  productRevenue: number;
  merchRevenue: number;
  extensionRevenue: number;
  giftCardRevenue: number;
  productCount: number;
  merchCount: number;
  extensionCount: number;
  giftCardCount: number;
  totalRetailRevenue: number;
}

/**
 * Fetches retail product revenue and categorises into Products, Merch, Extensions.
 * Priority: Extension > Merch > Product (standard retail).
 */
export function useRetailBreakdown(
  dateFrom: string,
  dateTo: string,
  enabled: boolean,
  locationId?: string,
) {
  return useQuery<RetailBreakdownData>({
    queryKey: ['retail-breakdown', dateFrom, dateTo, locationId ?? 'all'],
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

      let productRevenue = 0, merchRevenue = 0, extensionRevenue = 0, giftCardRevenue = 0;
      let productCount = 0, merchCount = 0, extensionCount = 0, giftCardCount = 0;

      for (const item of items) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        if (isExtensionProduct(item.item_name)) {
          extensionRevenue += amount;
          extensionCount += 1;
        } else if (isGiftCardProduct(item.item_name)) {
          giftCardRevenue += amount;
          giftCardCount += 1;
        } else if (isMerchProduct(item.item_name)) {
          merchRevenue += amount;
          merchCount += 1;
        } else {
          productRevenue += amount;
          productCount += 1;
        }
      }

      return {
        productRevenue,
        merchRevenue,
        extensionRevenue,
        giftCardRevenue,
        productCount,
        merchCount,
        extensionCount,
        giftCardCount,
        totalRetailRevenue: productRevenue + merchRevenue + extensionRevenue + giftCardRevenue,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
