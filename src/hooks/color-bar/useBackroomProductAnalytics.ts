/**
 * useBackroomProductAnalytics — Aggregates mix_bowl_lines by category and product.
 * Returns category-level and product-level usage breakdowns for the Product Analytics card.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface CategoryUsageRow {
  name: string;
  dispensedQty: number;
  wasteQty: number;
  wholesaleCost: number;
  retailValue: number;
  serviceCount: number;
}

export interface ProductUsageRow {
  name: string;
  category: string;
  dispensedQty: number;
  wasteQty: number;
  wholesaleCost: number;
  retailPrice: number;
  serviceCount: number;
}

export interface ProductAnalyticsData {
  categories: CategoryUsageRow[];
  products: ProductUsageRow[];
}

export function useBackroomProductAnalytics(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-product-analytics', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<ProductAnalyticsData> => {
      // 1. Fetch sessions in range
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id')
        .eq('organization_id', orgId!)
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');

      if (locationId) sessionsQuery = sessionsQuery.eq('location_id', locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      if (!sessionIds.length) return { categories: [], products: [] };

      // 2. Fetch bowls
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);
      if (bErr) throw bErr;

      const bowlIds = (bowls ?? []).map((b: any) => b.id);
      if (!bowlIds.length) return { categories: [], products: [] };

      // bowl→session map for service counting
      const bowlSessionMap = new Map<string, string>();
      for (const b of (bowls ?? []) as any[]) {
        bowlSessionMap.set(b.id, b.mix_session_id);
      }

      // 3. Fetch lines with product_id
      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('product_id, dispensed_quantity, dispensed_cost_snapshot, bowl_id')
        .in('bowl_id', bowlIds);
      if (lErr) throw lErr;

      // 4. Gather unique product IDs
      const productIds = [...new Set((lines ?? []).map((l: any) => l.product_id).filter(Boolean))];
      if (!productIds.length) return { categories: [], products: [] };

      // 5. Fetch product details
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, category, cost_price, retail_price')
        .in('id', productIds);
      if (pErr) throw pErr;

      const productMap = new Map<string, any>();
      for (const p of (products ?? []) as any[]) {
        productMap.set(p.id, p);
      }

      // 6. Fetch waste events
      const { data: wasteEvents, error: wErr } = await supabase
        .from('waste_events')
        .select('product_id, quantity')
        .in('mix_session_id', sessionIds);
      if (wErr) throw wErr;

      // 7. Aggregate by product
      const prodAgg = new Map<string, {
        dispensedQty: number; wholesaleCost: number; wasteQty: number; sessionIds: Set<string>;
      }>();

      for (const line of (lines ?? []) as any[]) {
        const pid = line.product_id;
        if (!pid) continue;
        const existing = prodAgg.get(pid) ?? { dispensedQty: 0, wholesaleCost: 0, wasteQty: 0, sessionIds: new Set() };
        existing.dispensedQty += line.dispensed_quantity ?? 0;
        existing.wholesaleCost += line.dispensed_cost_snapshot ?? 0;
        const sid = bowlSessionMap.get(line.bowl_id);
        if (sid) existing.sessionIds.add(sid);
        prodAgg.set(pid, existing);
      }

      // Add waste
      for (const w of (wasteEvents ?? []) as any[]) {
        if (!w.product_id) continue;
        const existing = prodAgg.get(w.product_id) ?? { dispensedQty: 0, wholesaleCost: 0, wasteQty: 0, sessionIds: new Set() };
        existing.wasteQty += w.quantity ?? 0;
        prodAgg.set(w.product_id, existing);
      }

      // 8. Build product rows
      const productRows: ProductUsageRow[] = [];
      for (const [pid, agg] of prodAgg.entries()) {
        const prod = productMap.get(pid);
        productRows.push({
          name: prod?.name ?? 'Unknown',
          category: prod?.category ?? 'Uncategorized',
          dispensedQty: Math.round(agg.dispensedQty * 100) / 100,
          wasteQty: Math.round(agg.wasteQty * 100) / 100,
          wholesaleCost: Math.round(agg.wholesaleCost * 100) / 100,
          retailPrice: prod?.retail_price ?? 0,
          serviceCount: agg.sessionIds.size,
        });
      }
      productRows.sort((a, b) => b.wholesaleCost - a.wholesaleCost);

      // 9. Aggregate by category
      const catAgg = new Map<string, {
        dispensedQty: number; wholesaleCost: number; wasteQty: number; retailValue: number; sessionIds: Set<string>;
      }>();

      for (const pr of productRows) {
        const cat = pr.category;
        const existing = catAgg.get(cat) ?? { dispensedQty: 0, wholesaleCost: 0, wasteQty: 0, retailValue: 0, sessionIds: new Set() };
        existing.dispensedQty += pr.dispensedQty;
        existing.wholesaleCost += pr.wholesaleCost;
        existing.wasteQty += pr.wasteQty;
        existing.retailValue += pr.retailPrice;
        // We can't perfectly re-derive sessionIds at category level from product rows,
        // so serviceCount at category level is the sum of product serviceCounts (may double-count sessions across products)
        catAgg.set(cat, existing);
      }

      const categoryRows: CategoryUsageRow[] = Array.from(catAgg.entries()).map(([name, data]) => ({
        name,
        dispensedQty: Math.round(data.dispensedQty * 100) / 100,
        wasteQty: Math.round(data.wasteQty * 100) / 100,
        wholesaleCost: Math.round(data.wholesaleCost * 100) / 100,
        retailValue: Math.round(data.retailValue * 100) / 100,
        serviceCount: productRows.filter(p => p.category === name).reduce((sum, p) => sum + p.serviceCount, 0),
      })).sort((a, b) => b.wholesaleCost - a.wholesaleCost);

      return {
        categories: categoryRows,
        products: productRows.slice(0, 20),
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
