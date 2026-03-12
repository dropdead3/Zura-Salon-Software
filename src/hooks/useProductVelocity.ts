import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays, parseISO } from 'date-fns';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductVelocityEntry {
  velocity: number; // units/day
  totalUnitsSold: number;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
}

const ANALYSIS_DAYS = 90;
const BATCH_SIZE = 1000;

async function fetchAllBatched(query: any) {
  let allData: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return allData;
}

/**
 * Lightweight hook that queries last 90 days of POS transaction items
 * and returns a velocity map keyed by product name (lowercase).
 */
export function useProductVelocity(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-velocity', orgId, locationId],
    queryFn: async () => {
      const now = new Date();
      const dateFrom = format(subDays(now, ANALYSIS_DAYS), 'yyyy-MM-dd');
      const dateTo = format(now, 'yyyy-MM-dd');

      let query = supabase
        .from('phorest_transaction_items')
        .select('product_name, quantity, transaction_date')
        .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const items = await fetchAllBatched(query);

      const map = new Map<string, { totalUnits: number; lastDate: string | null }>();

      for (const item of items) {
        const name = (item.product_name || '').toLowerCase().trim();
        if (!name) continue;
        const qty = Math.abs(item.quantity || 0);
        const existing = map.get(name) || { totalUnits: 0, lastDate: null };
        existing.totalUnits += qty;
        if (item.transaction_date) {
          if (!existing.lastDate || item.transaction_date > existing.lastDate) {
            existing.lastDate = item.transaction_date;
          }
        }
        map.set(name, existing);
      }

      // Convert to velocity entries
      const result = new Map<string, ProductVelocityEntry>();
      for (const [name, data] of map) {
        const daysSinceLastSale = data.lastDate
          ? differenceInDays(now, parseISO(data.lastDate))
          : null;
        result.set(name, {
          velocity: data.totalUnits / ANALYSIS_DAYS,
          totalUnitsSold: data.totalUnits,
          lastSoldDate: data.lastDate,
          daysSinceLastSale,
        });
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
