/**
 * useInventoryIntelligence — Lightweight per-product usage velocity hook.
 * Queries trailing 28-day stock_movements for usage/dispensing/sold events,
 * returns a Map<productId, { dailyUsage, daysRemaining }> for O(1) row lookup.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface ProductIntelligence {
  dailyUsage: number;
  daysRemaining: number;
}

export function useInventoryIntelligence(locationId?: string) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['inventory-intelligence', orgId, locationId],
    queryFn: async (): Promise<Map<string, ProductIntelligence>> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 28);

      // 1. Get on-hand quantities
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, quantity_on_hand')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (pErr) throw pErr;
      const onHandMap = new Map<string, number>();
      for (const p of (products ?? []) as any[]) {
        onHandMap.set(p.id, p.quantity_on_hand ?? 0);
      }

      // 2. Get trailing 28-day usage movements
      let query = supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('organization_id', orgId!)
        .in('reason', ['usage', 'dispensing', 'sold'])
        .gte('created_at', cutoff.toISOString());

      if (locationId) query = query.eq('location_id', locationId);

      const { data: movements, error: mErr } = await query;
      if (mErr) throw mErr;

      // 3. Aggregate usage per product (movements are negative, take abs)
      const usageMap = new Map<string, number>();
      for (const m of (movements ?? []) as any[]) {
        if (!m.product_id) continue;
        usageMap.set(
          m.product_id,
          (usageMap.get(m.product_id) ?? 0) + Math.abs(m.quantity),
        );
      }

      // 4. Build intelligence map
      const result = new Map<string, ProductIntelligence>();
      for (const [productId, totalUsage] of usageMap) {
        const dailyUsage = totalUsage / 28;
        const onHand = onHandMap.get(productId) ?? 0;
        const daysRemaining = dailyUsage > 0 ? onHand / dailyUsage : Infinity;
        result.set(productId, {
          dailyUsage: Math.round(dailyUsage * 10) / 10,
          daysRemaining: daysRemaining === Infinity ? Infinity : Math.round(daysRemaining),
        });
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000,
  });
}
