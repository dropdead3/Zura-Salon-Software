/**
 * useGhostLossDetection — Compares theoretical vs actual inventory depletion.
 * Ghost loss = unexplained shrinkage (theoretical > actual change).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { calculateGhostLoss, type GhostLossResult } from '@/lib/backroom/analytics-engine';

export interface ProductGhostLoss extends GhostLossResult {
  productId: string;
  productName: string;
  theoreticalDepletion: number;
  actualStockDecrease: number;
}

export function useGhostLossDetection(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['ghost-loss', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<{
      products: ProductGhostLoss[];
      totalGhostLossQty: number;
      totalGhostLossCost: number;
    }> => {
      // 1. Get theoretical depletion: sum of usage stock_movements in period
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('organization_id', orgId!)
        .eq('reason', 'usage')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (locationId) movementsQuery = movementsQuery.eq('location_id', locationId);

      const { data: movements, error: mErr } = await movementsQuery;
      if (mErr) throw mErr;

      // Aggregate by product (usage movements are negative, so negate)
      const theoreticalMap = new Map<string, number>();
      for (const m of (movements ?? []) as any[]) {
        if (!m.product_id) continue;
        theoreticalMap.set(
          m.product_id,
          (theoreticalMap.get(m.product_id) ?? 0) + Math.abs(m.quantity)
        );
      }

      if (!theoreticalMap.size) {
        return { products: [], totalGhostLossQty: 0, totalGhostLossCost: 0 };
      }

      const productIds = Array.from(theoreticalMap.keys());

      // 2. Get actual stock changes from all movement types in period
      let allMovementsQuery = supabase
        .from('stock_movements')
        .select('product_id, quantity, reason')
        .eq('organization_id', orgId!)
        .in('product_id', productIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (locationId) allMovementsQuery = allMovementsQuery.eq('location_id', locationId);

      const { data: allMovements, error: amErr } = await allMovementsQuery;
      if (amErr) throw amErr;

      // Actual depletion = net negative movements (excluding receiving, which adds stock)
      const actualMap = new Map<string, number>();
      for (const m of (allMovements ?? []) as any[]) {
        if (!m.product_id) continue;
        // Sum all movements; negative = stock decrease
        const current = actualMap.get(m.product_id) ?? 0;
        actualMap.set(m.product_id, current + m.quantity);
      }

      // 3. Get product info for names and costs
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price')
        .in('id', productIds);

      const productInfoMap = new Map<string, { name: string; cost: number }>();
      for (const p of (products ?? []) as any[]) {
        productInfoMap.set(p.id, { name: p.name, cost: p.cost_price ?? 0 });
      }

      // 4. Calculate ghost loss per product
      const results: ProductGhostLoss[] = [];
      let totalGhostLossQty = 0;
      let totalGhostLossCost = 0;

      for (const [productId, theoretical] of theoreticalMap) {
        const netMovement = actualMap.get(productId) ?? 0;
        // Actual stock decrease = abs of net negative movement
        const actualDecrease = Math.abs(Math.min(0, netMovement));
        const info = productInfoMap.get(productId);
        const avgCost = info?.cost ?? 0;

        const loss = calculateGhostLoss(
          { theoreticalDepletion: theoretical, actualStockDecrease: actualDecrease },
          avgCost
        );

        if (Math.abs(loss.ghostLossQty) > 0.01) {
          results.push({
            productId,
            productName: info?.name ?? productId,
            theoreticalDepletion: theoretical,
            actualStockDecrease: actualDecrease,
            ...loss,
          });
          totalGhostLossQty += loss.ghostLossQty;
          totalGhostLossCost += loss.ghostLossCost;
        }
      }

      return {
        products: results.sort((a, b) => b.ghostLossCost - a.ghostLossCost),
        totalGhostLossQty: Math.round(totalGhostLossQty * 100) / 100,
        totalGhostLossCost: Math.round(totalGhostLossCost * 100) / 100,
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
