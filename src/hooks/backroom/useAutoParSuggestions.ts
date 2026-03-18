/**
 * useAutoParSuggestions — Computes velocity-based par level recommendations.
 * Uses trailing 28-day stock_movements + supplier lead times.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { suggestParLevel, type ParLevelSuggestion } from '@/lib/parLevelSuggestion';
import { subDays } from 'date-fns';

export interface AutoParSuggestion extends ParLevelSuggestion {
  productId: string;
  productName: string;
  currentPar: number | null;
}

export function useAutoParSuggestions(productIds: string[]) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['auto-par-suggestions', orgId, productIds.length],
    queryFn: async (): Promise<AutoParSuggestion[]> => {
      const cutoff = subDays(new Date(), 28).toISOString();

      // Fetch movements + suppliers + product info in parallel
      const [movementsResult, suppliersResult, productsResult] = await Promise.all([
        supabase
          .from('stock_movements')
          .select('product_id, quantity_change, created_at')
          .eq('organization_id', orgId!)
          .in('product_id', productIds)
          .gte('created_at', cutoff)
          .in('reason', ['dispensing', 'count_adjustment', 'sold', 'usage']),
        supabase
          .from('product_suppliers')
          .select('product_id, avg_delivery_days')
          .eq('organization_id', orgId!)
          .in('product_id', productIds),
        supabase
          .from('products')
          .select('id, name, par_level')
          .in('id', productIds),
      ]);

      // Build velocity map (units consumed per day over 28 days)
      const velocityMap = new Map<string, number>();
      for (const m of movementsResult.data || []) {
        const consumed = Math.abs(m.quantity_change);
        velocityMap.set(m.product_id, (velocityMap.get(m.product_id) ?? 0) + consumed);
      }

      // Build lead time map
      const leadTimeMap = new Map<string, number>();
      for (const s of suppliersResult.data || []) {
        if (s.avg_delivery_days) leadTimeMap.set(s.product_id, s.avg_delivery_days);
      }

      // Build product info map
      const productMap = new Map<string, { name: string; par_level: number | null }>();
      for (const p of productsResult.data || []) {
        productMap.set(p.id, { name: p.name, par_level: p.par_level });
      }

      return productIds.map(pid => {
        const totalConsumed = velocityMap.get(pid) ?? 0;
        const dailyVelocity = totalConsumed / 28;
        const leadTime = leadTimeMap.get(pid);
        const product = productMap.get(pid);
        const suggestion = suggestParLevel(dailyVelocity, leadTime);

        return {
          ...suggestion,
          productId: pid,
          productName: product?.name ?? pid.slice(0, 8),
          currentPar: product?.par_level ?? null,
        };
      });
    },
    enabled: !!orgId && productIds.length > 0,
    staleTime: 60_000,
  });
}
