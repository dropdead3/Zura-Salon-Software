import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isExtensionProduct, isGiftCardProduct, isMerchProduct } from '@/utils/serviceCategorization';

type RetailCategory = 'Products' | 'Merch' | 'Gift Cards' | 'Extensions';

function addLocationFilter(query: any, locationId?: string) {
  if (isAllLocations(locationId)) return query;
  const ids = parseLocationIds(locationId);
  if (ids.length === 1) return query.eq('location_id', ids[0]);
  return query.in('location_id', ids);
}

async function fetchAllBatched<T>(
  buildQuery: (from: number, to: number) => any,
  batchSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await buildQuery(from, from + batchSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...data);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return all;
}

function matchesCategory(name: string | null, category: RetailCategory): boolean {
  switch (category) {
    case 'Extensions': return isExtensionProduct(name);
    case 'Gift Cards': return isGiftCardProduct(name);
    case 'Merch': return isMerchProduct(name);
    case 'Products':
      return !isExtensionProduct(name) && !isGiftCardProduct(name) && !isMerchProduct(name);
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

      const grouped = new Map<string, { quantity: number; revenue: number }>();
      for (const item of items) {
        if (!matchesCategory(item.item_name, category)) continue;
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
