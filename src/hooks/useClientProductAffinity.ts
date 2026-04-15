import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';
import { DEMO_PRODUCT_AFFINITY } from '@/hooks/dock/dockDemoData';

export interface ClientProductAffinity {
  itemName: string;
  purchaseCount: number;
  lastPurchaseDate: string;
  avgDaysBetween: number | null;
  daysSinceLastPurchase: number | null;
  mayNeedRestock: boolean;
}

export function useClientProductAffinity(phorestClientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-product-affinity', phorestClientId],
    queryFn: async () => {
      // Demo mode: return static affinity data
      if (phorestClientId?.startsWith('demo-')) {
        return DEMO_PRODUCT_AFFINITY[phorestClientId] ?? [];
      }
      const { data, error } = await supabase
        .from('v_all_transaction_items')
        .select('item_name, transaction_date')
        .eq('external_client_id', phorestClientId!)
        .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
        .not('item_name', 'is', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by item_name, collecting all dates
      const map = new Map<string, { count: number; dates: string[] }>();
      for (const row of data) {
        const name = row.item_name!;
        const existing = map.get(name);
        if (existing) {
          existing.count++;
          existing.dates.push(row.transaction_date ?? '');
        } else {
          map.set(name, { count: 1, dates: [row.transaction_date ?? ''] });
        }
      }

      const now = new Date();

      const sorted: ClientProductAffinity[] = Array.from(map.entries())
        .map(([itemName, { count, dates }]) => {
          const validDates = dates.filter(Boolean).sort().reverse();
          const lastDate = validDates[0] || '';
          
          let avgDaysBetween: number | null = null;
          let daysSinceLastPurchase: number | null = null;
          let mayNeedRestock = false;

          if (validDates.length >= 2) {
            // Compute average interval between purchases
            const intervals: number[] = [];
            for (let i = 0; i < validDates.length - 1; i++) {
              intervals.push(differenceInDays(parseISO(validDates[i]), parseISO(validDates[i + 1])));
            }
            avgDaysBetween = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
            daysSinceLastPurchase = differenceInDays(now, parseISO(lastDate));
            // Flag if last purchase exceeds 1.2× average interval
            if (avgDaysBetween > 0 && daysSinceLastPurchase > avgDaysBetween * 1.2) {
              mayNeedRestock = true;
            }
          } else if (lastDate) {
            daysSinceLastPurchase = differenceInDays(now, parseISO(lastDate));
          }

          return {
            itemName,
            purchaseCount: count,
            lastPurchaseDate: lastDate,
            avgDaysBetween,
            daysSinceLastPurchase,
            mayNeedRestock,
          };
        })
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 5);

      return sorted;
    },
    enabled: !!phorestClientId,
    staleTime: 5 * 60 * 1000,
  });
}
