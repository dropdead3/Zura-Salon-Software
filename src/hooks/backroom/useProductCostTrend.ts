/**
 * useProductCostTrend — Fetches cost history per product for sparkline rendering.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface ProductCostTrendItem {
  productId: string;
  productName: string;
  currentCost: number;
  costHistory: number[]; // chronological cost values
  changePercent: number;
  supplierName: string | null;
}

export function useProductCostTrend(productIds?: string[]) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['product-cost-trend', orgId, productIds],
    queryFn: async (): Promise<ProductCostTrendItem[]> => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      let query = supabase
        .from('product_cost_history')
        .select('product_id, supplier_name, cost_price, recorded_at')
        .eq('organization_id', orgId!)
        .gte('recorded_at', ninetyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (productIds && productIds.length > 0) {
        query = query.in('product_id', productIds);
      }

      const { data: costHistory, error } = await query;
      if (error) throw error;
      if (!costHistory || costHistory.length === 0) return [];

      // Get product names
      const uniqueProductIds = [...new Set(costHistory.map((c) => c.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price')
        .in('id', uniqueProductIds);

      const productMap = new Map(
        (products ?? []).map((p) => [p.id, p]),
      );

      // Group by product
      const grouped = new Map<string, { costs: number[]; supplier: string | null }>();
      for (const row of costHistory) {
        if (!grouped.has(row.product_id)) {
          grouped.set(row.product_id, { costs: [], supplier: row.supplier_name });
        }
        grouped.get(row.product_id)!.costs.push(Number(row.cost_price));
      }

      const items: ProductCostTrendItem[] = [];
      for (const [productId, { costs, supplier }] of grouped) {
        const product = productMap.get(productId);
        if (!product || costs.length < 2) continue;

        const first = costs[0];
        const last = costs[costs.length - 1];
        const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;

        items.push({
          productId,
          productName: product.name,
          currentCost: Number(product.cost_price ?? last),
          costHistory: costs,
          changePercent: Math.round(changePercent * 10) / 10,
          supplierName: supplier,
        });
      }

      // Sort by largest increase first
      items.sort((a, b) => b.changePercent - a.changePercent);
      return items;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
