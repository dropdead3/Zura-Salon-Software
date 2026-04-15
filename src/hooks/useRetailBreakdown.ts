import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct, isGiftCardProduct, isMerchProduct, isVishServiceCharge } from '@/utils/serviceCategorization';

/** Apply location filter. */
function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

/** Item types that count as service revenue — everything else lands here. */
const SERVICE_ITEM_TYPES = new Set(['service', 'sale_fee', 'special_offer_item']);

/** Item types representing financial pass-throughs (not retail products). */
const FEE_ITEM_TYPES = new Set(['appointment_deposit', 'outstanding_balance_pmt']);

export interface RetailBreakdownData {
  productRevenue: number;
  merchRevenue: number;
  extensionRevenue: number;
  giftCardRevenue: number;
  feesRevenue: number;
  productCount: number;
  merchCount: number;
  extensionCount: number;
  giftCardCount: number;
  feesCount: number;
  totalRetailRevenue: number;
}

/**
 * Fetches all non-service transaction items and categorises into
 * Products, Merch, Extensions, Gift Cards, and Fees & Deposits.
 *
 * Uses a NOT-IN filter on service types so new item_type values
 * are automatically included rather than silently dropped.
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
        item_type: string | null;
        item_name: string | null;
        total_amount: number | null;
        tax_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('item_type, item_name, total_amount, tax_amount')
          .gte('transaction_date', txDateFrom)
          .lte('transaction_date', txDateTo)
          .not('item_type', 'in', '("service","Service","SERVICE","sale_fee","special_offer_item")')
          .range(from, to);
        q = addLocationFilter(q, locationId);
        return q;
      });

      let productRevenue = 0, merchRevenue = 0, extensionRevenue = 0, giftCardRevenue = 0, feesRevenue = 0;
      let productCount = 0, merchCount = 0, extensionCount = 0, giftCardCount = 0, feesCount = 0;

      for (const item of items) {
        // Vish chemical fees masquerade as products — skip them from retail
        if (isVishServiceCharge(item.item_name, item.item_type)) continue;
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();

        // Financial pass-throughs
        if (FEE_ITEM_TYPES.has(itemType)) {
          feesRevenue += amount;
          feesCount += 1;
        } else if (isExtensionProduct(item.item_name)) {
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
        feesRevenue,
        productCount,
        merchCount,
        extensionCount,
        giftCardCount,
        feesCount,
        totalRetailRevenue: productRevenue + merchRevenue + extensionRevenue + giftCardRevenue + feesRevenue,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
