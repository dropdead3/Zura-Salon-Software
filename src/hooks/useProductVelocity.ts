import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays, parseISO } from 'date-fns';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductVelocityEntry {
  velocity: number; // units/day (current 90 days)
  totalUnitsSold: number;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
  /** Prior 90-day velocity (days 91-180) */
  priorVelocity: number;
  /** Percentage change: ((current - prior) / prior) * 100. Null if no prior data. */
  velocityChange: number | null;
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
 * Lightweight hook that queries last 180 days of POS transaction items
 * and returns a velocity map keyed by product name (lowercase),
 * including current and prior 90-day velocity for trend comparison.
 */
export function useProductVelocity(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-velocity', orgId, locationId],
    queryFn: async () => {
      const now = new Date();
      // Fetch full 180-day window in one query
      const dateFrom = format(subDays(now, ANALYSIS_DAYS * 2), 'yyyy-MM-dd');
      const dateTo = format(now, 'yyyy-MM-dd');
      const midpoint = format(subDays(now, ANALYSIS_DAYS), 'yyyy-MM-dd');

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

      // Split into current (0-90 days) and prior (91-180 days)
      const currentMap = new Map<string, { totalUnits: number; lastDate: string | null }>();
      const priorMap = new Map<string, { totalUnits: number }>();

      for (const item of items) {
        const name = (item.product_name || '').toLowerCase().trim();
        if (!name) continue;
        const qty = Math.abs(item.quantity || 0);
        const isCurrent = item.transaction_date >= midpoint;

        if (isCurrent) {
          const existing = currentMap.get(name) || { totalUnits: 0, lastDate: null };
          existing.totalUnits += qty;
          if (item.transaction_date) {
            if (!existing.lastDate || item.transaction_date > existing.lastDate) {
              existing.lastDate = item.transaction_date;
            }
          }
          currentMap.set(name, existing);
        } else {
          const existing = priorMap.get(name) || { totalUnits: 0 };
          existing.totalUnits += qty;
          priorMap.set(name, existing);
        }
      }

      // Merge all product names
      const allNames = new Set([...currentMap.keys(), ...priorMap.keys()]);

      const result = new Map<string, ProductVelocityEntry>();
      for (const name of allNames) {
        const current = currentMap.get(name);
        const prior = priorMap.get(name);
        const currentVelocity = (current?.totalUnits ?? 0) / ANALYSIS_DAYS;
        const priorVelocity = (prior?.totalUnits ?? 0) / ANALYSIS_DAYS;
        const daysSinceLastSale = current?.lastDate
          ? differenceInDays(now, parseISO(current.lastDate))
          : null;

        let velocityChange: number | null = null;
        if (priorVelocity > 0) {
          velocityChange = ((currentVelocity - priorVelocity) / priorVelocity) * 100;
        } else if (currentVelocity > 0) {
          velocityChange = 100; // new product that didn't sell before
        }

        result.set(name, {
          velocity: currentVelocity,
          totalUnitsSold: current?.totalUnits ?? 0,
          lastSoldDate: current?.lastDate ?? null,
          daysSinceLastSale,
          priorVelocity,
          velocityChange,
        });
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
