import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays, parseISO } from 'date-fns';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductVelocityEntry {
  velocity: number; // units/day (current 90 days, flat average)
  /** Weighted velocity using 3:2:1 buckets (recent 30d weighted 3x) */
  weightedVelocity: number;
  totalUnitsSold: number;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
  /** Prior 90-day velocity (days 91-180) */
  priorVelocity: number;
  /** Percentage change: ((current - prior) / prior) * 100. Null if no prior data. */
  velocityChange: number | null;
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

const ANALYSIS_DAYS = 90;

/**
 * Lightweight hook that queries last 180 days of POS transaction items
 * and returns a velocity map keyed by product name (lowercase),
 * including current and prior 90-day velocity, plus weighted velocity
 * using 3:2:1 exponential decay across 30-day buckets.
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
      // 30-day bucket boundaries for weighted velocity
      const bucket1Start = format(subDays(now, 30), 'yyyy-MM-dd');  // 0-30 days (weight 3)
      const bucket2Start = format(subDays(now, 60), 'yyyy-MM-dd');  // 31-60 days (weight 2)
      // bucket3 = 61-90 days (weight 1), starts at midpoint

      let query = supabase
        .from('v_all_transaction_items' as any)
        .select('product_name, quantity, transaction_date')
        .in('item_type', ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'])
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const items = await fetchAllBatched(query);

      // Split into current buckets and prior window
      const currentMap = new Map<string, { totalUnits: number; lastDate: string | null; bucket1: number; bucket2: number; bucket3: number }>();
      const priorMap = new Map<string, { totalUnits: number }>();

      for (const item of items) {
        const name = (item.product_name || '').toLowerCase().trim();
        if (!name) continue;
        const qty = Math.abs(item.quantity || 0);
        const txDate = item.transaction_date;
        const isCurrent = txDate >= midpoint;

        if (isCurrent) {
          const existing = currentMap.get(name) || { totalUnits: 0, lastDate: null, bucket1: 0, bucket2: 0, bucket3: 0 };
          existing.totalUnits += qty;

          // Assign to weighted bucket
          if (txDate >= bucket1Start) {
            existing.bucket1 += qty; // most recent 30 days
          } else if (txDate >= bucket2Start) {
            existing.bucket2 += qty; // 31-60 days
          } else {
            existing.bucket3 += qty; // 61-90 days
          }

          if (txDate) {
            if (!existing.lastDate || txDate > existing.lastDate) {
              existing.lastDate = txDate;
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
      const totalWeight = 3 + 2 + 1; // = 6

      for (const name of allNames) {
        const current = currentMap.get(name);
        const prior = priorMap.get(name);
        const currentVelocity = (current?.totalUnits ?? 0) / ANALYSIS_DAYS;
        const priorVelocity = (prior?.totalUnits ?? 0) / ANALYSIS_DAYS;

        // Weighted velocity: each bucket covers ~30 days
        // weightedVelocity = (bucket1 * 3 + bucket2 * 2 + bucket3 * 1) / (30 * totalWeight)
        const weightedUnits = ((current?.bucket1 ?? 0) * 3) + ((current?.bucket2 ?? 0) * 2) + ((current?.bucket3 ?? 0) * 1);
        const weightedVelocity = weightedUnits / (30 * totalWeight);

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
          weightedVelocity,
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
