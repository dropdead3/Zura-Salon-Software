import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct, isGiftCardProduct, isMerchProduct } from '@/utils/serviceCategorization';

type RetailCategory = 'Products' | 'Merch' | 'Gift Cards' | 'Extensions' | 'Fees & Deposits';

function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

const FEE_ITEM_TYPES = new Set(['appointment_deposit', 'outstanding_balance_pmt']);

function matchesCategory(name: string | null, itemType: string | null, category: RetailCategory): boolean {
  const type = (itemType || '').toLowerCase();
  switch (category) {
    case 'Fees & Deposits': return FEE_ITEM_TYPES.has(type);
    case 'Extensions': return !FEE_ITEM_TYPES.has(type) && isExtensionProduct(name);
    case 'Gift Cards': return !FEE_ITEM_TYPES.has(type) && !isExtensionProduct(name) && isGiftCardProduct(name);
    case 'Merch': return !FEE_ITEM_TYPES.has(type) && !isExtensionProduct(name) && !isGiftCardProduct(name) && isMerchProduct(name);
    case 'Products':
      return !FEE_ITEM_TYPES.has(type) && !isExtensionProduct(name) && !isGiftCardProduct(name) && !isMerchProduct(name);
  }
}

export interface RetailCategoryItem {
  itemName: string;
  quantity: number;
  revenue: number;
}

export function useRetailCategoryItems(
  dateFrom: string,
  dateTo: string,
  category: RetailCategory | null,
  locationId?: string,
) {
  return useQuery<RetailCategoryItem[]>({
    queryKey: ['retail-category-items', dateFrom, dateTo, category, locationId ?? 'all'],
    queryFn: async () => {
      if (!category) return [];
      const txDateFrom = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`;
      const txDateTo = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999`;

      const items = await fetchAllBatched<{
        item_type: string | null;
        item_name: string | null;
        total_amount: number | null;
        tax_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('item_type, item_name, total_amount, tax_amount')
          .gte('transaction_date', txDateFrom)
          .lte('transaction_date', txDateTo)
          .not('item_type', 'in', '("service","Service","SERVICE","sale_fee","special_offer_item")')
          .range(from, to);
        q = addLocationFilter(q, locationId);
        return q;
      });

      const grouped = new Map<string, { quantity: number; revenue: number }>();
      for (const item of items) {
        if (!matchesCategory(item.item_name, item.item_type, category)) continue;
        const name = item.item_name?.trim() || 'Unknown Product';
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const existing = grouped.get(name);
        if (existing) {
          existing.quantity += 1;
          existing.revenue += amount;
        } else {
          grouped.set(name, { quantity: 1, revenue: amount });
        }
      }

      return Array.from(grouped.entries())
        .map(([itemName, { quantity, revenue }]) => ({ itemName, quantity, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!category,
    staleTime: 2 * 60 * 1000,
  });
}
