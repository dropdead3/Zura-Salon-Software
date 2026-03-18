/**
 * useProductPOHistory — Aggregates 12-week PO frequency per product.
 * Returns Map<product_id, number[]> where each array has 12 entries (weekly counts).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { subWeeks, startOfWeek, differenceInWeeks } from 'date-fns';

const WEEKS = 12;

export function useProductPOHistory() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['product-po-history', orgId],
    queryFn: async (): Promise<Map<string, number[]>> => {
      const now = new Date();
      const cutoff = subWeeks(now, WEEKS);
      const weekStart = startOfWeek(cutoff, { weekStartsOn: 1 });

      // Fetch PO lines with their PO created_at
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('id, created_at')
        .eq('organization_id', orgId!)
        .gte('created_at', weekStart.toISOString());

      if (!orders || orders.length === 0) return new Map();

      const poIds = orders.map(o => o.id);
      const poDateMap = new Map(orders.map(o => [o.id, new Date(o.created_at)]));

      const { data: lines } = await supabase
        .from('purchase_order_lines')
        .select('product_id, purchase_order_id')
        .in('purchase_order_id', poIds);

      if (!lines || lines.length === 0) return new Map();

      // Bucket into weeks per product
      const result = new Map<string, number[]>();

      for (const line of lines) {
        const poDate = poDateMap.get(line.purchase_order_id);
        if (!poDate) continue;

        const weekIdx = Math.min(WEEKS - 1, Math.max(0, WEEKS - 1 - differenceInWeeks(now, poDate)));

        if (!result.has(line.product_id)) {
          result.set(line.product_id, new Array(WEEKS).fill(0));
        }
        result.get(line.product_id)![weekIdx]++;
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
