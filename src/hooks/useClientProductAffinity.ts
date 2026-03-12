import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProductAffinity {
  itemName: string;
  purchaseCount: number;
  lastPurchaseDate: string;
}

export function useClientProductAffinity(phorestClientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-product-affinity', phorestClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_transaction_items')
        .select('item_name, transaction_date')
        .eq('phorest_client_id', phorestClientId!)
        .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
        .not('item_name', 'is', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by item_name
      const map = new Map<string, { count: number; lastDate: string }>();
      for (const row of data) {
        const name = row.item_name!;
        const existing = map.get(name);
        if (existing) {
          existing.count++;
        } else {
          map.set(name, { count: 1, lastDate: row.transaction_date ?? '' });
        }
      }

      // Sort by frequency desc, take top 5
      const sorted: ClientProductAffinity[] = Array.from(map.entries())
        .map(([itemName, { count, lastDate }]) => ({
          itemName,
          purchaseCount: count,
          lastPurchaseDate: lastDate,
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 5);

      return sorted;
    },
    enabled: !!phorestClientId,
    staleTime: 5 * 60 * 1000,
  });
}
