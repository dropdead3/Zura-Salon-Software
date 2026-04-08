import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface CoPurchasePair {
  productA: string;
  productB: string;
  count: number;
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

/**
 * Analyzes co-purchase patterns from transaction data.
 * Groups products bought in the same transaction and returns frequency pairs.
 */
export function useProductCoPurchase(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-co-purchase', orgId, locationId],
    queryFn: async () => {
      // Fetch last 90 days of product transactions
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 90);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      let query = supabase
        .from('phorest_transaction_items')
        .select('transaction_id, product_name')
        .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
        .gte('transaction_date', dateFromStr)
        .not('product_name', 'is', null);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const items = await fetchAllBatched(query);

      // Group by transaction_id
      const txnMap = new Map<string, Set<string>>();
      for (const item of items) {
        if (!item.transaction_id || !item.product_name) continue;
        const name = (item.product_name as string).toLowerCase().trim();
        if (!name) continue;
        if (!txnMap.has(item.transaction_id)) {
          txnMap.set(item.transaction_id, new Set());
        }
        txnMap.get(item.transaction_id)!.add(name);
      }

      // Compute co-purchase pairs
      const pairCounts = new Map<string, number>();
      for (const products of txnMap.values()) {
        if (products.size < 2) continue;
        const arr = Array.from(products).sort();
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const key = `${arr[i]}|||${arr[j]}`;
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
          }
        }
      }

      // Sort by frequency and return top pairs
      const pairs: CoPurchasePair[] = [];
      for (const [key, count] of pairCounts) {
        if (count < 2) continue; // minimum threshold
        const [productA, productB] = key.split('|||');
        pairs.push({ productA, productB, count });
      }
      pairs.sort((a, b) => b.count - a.count);

      // Also build a per-product lookup
      const productPairs = new Map<string, { pairedWith: string; count: number }[]>();
      for (const pair of pairs) {
        if (!productPairs.has(pair.productA)) productPairs.set(pair.productA, []);
        if (!productPairs.has(pair.productB)) productPairs.set(pair.productB, []);
        productPairs.get(pair.productA)!.push({ pairedWith: pair.productB, count: pair.count });
        productPairs.get(pair.productB)!.push({ pairedWith: pair.productA, count: pair.count });
      }

      return { pairs: pairs.slice(0, 50), productPairs };
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}
