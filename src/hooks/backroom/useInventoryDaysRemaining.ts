/**
 * useInventoryDaysRemaining — Per-product days-remaining projection
 * based on trailing 28-day usage rate.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  calculateInventoryDaysRemaining,
  type InventoryDaysResult,
} from '@/lib/backroom/analytics-engine';

export function useInventoryDaysRemaining(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-days-remaining', orgId, locationId],
    queryFn: async (): Promise<InventoryDaysResult[]> => {
      // 1. Get all active products with stock
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, quantity_on_hand, cost_price')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (pErr) throw pErr;
      if (!(products ?? []).length) return [];

      // 2. Get trailing 28-day usage from stock_movements
      const twentyEightDaysAgo = new Date();
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, quantity_change')
        .eq('organization_id', orgId!)
        .in('reason', ['usage', 'dispensing', 'sold'])
        .gte('created_at', twentyEightDaysAgo.toISOString());

      if (locationId) movementsQuery = movementsQuery.eq('location_id', locationId);

      const { data: movements, error: mErr } = await movementsQuery;
      if (mErr) throw mErr;

      // Aggregate usage by product (usage movements are negative)
      const usageMap = new Map<string, number>();
      for (const m of (movements ?? []) as any[]) {
        if (!m.product_id) continue;
        usageMap.set(
          m.product_id,
          (usageMap.get(m.product_id) ?? 0) + Math.abs(m.quantity_change)
        );
      }

      // 3. Build inputs and calculate
      const inputs = (products as any[]).map((p) => ({
        productId: p.id,
        productName: p.name,
        onHand: p.quantity_on_hand ?? 0,
        dailyUsageRate: (usageMap.get(p.id) ?? 0) / 28,
        costPrice: p.cost_price ?? 0,
      }));

      return calculateInventoryDaysRemaining(inputs)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000,
  });
}
