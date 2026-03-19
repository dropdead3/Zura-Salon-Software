/**
 * useProductUsageFrequency — 90-day product-level dispensing frequency timetable.
 * Joins mix_bowl_lines → mix_bowls → mix_sessions to aggregate per-product usage,
 * then merges with products table to include dormant (0-use) items.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type UsageTier = 'frequent' | 'regular' | 'occasional' | 'rare' | 'dormant';

export interface ProductUsageRow {
  productId: string;
  productName: string;
  brand: string | null;
  category: string | null;
  sessionsUsed: number;
  totalDispensedGrams: number;
  lastUsedDate: string | null;
  daysSinceLastUse: number | null;
  tier: UsageTier;
  costPrice: number | null;
  quantityOnHand: number | null;
}

function classifyTier(sessionsUsed: number, daysSinceLastUse: number | null): UsageTier {
  if (sessionsUsed === 0) return 'dormant';
  if (daysSinceLastUse !== null && daysSinceLastUse <= 7 && sessionsUsed >= 12) return 'frequent';
  if (sessionsUsed >= 6) return 'regular';
  if (sessionsUsed >= 3) return 'occasional';
  return 'rare';
}

export function useProductUsageFrequency(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-usage-frequency', orgId, locationId],
    queryFn: async (): Promise<ProductUsageRow[]> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffISO = cutoff.toISOString();

      // 1. Get all backroom-tracked products for this org
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, brand, category, cost_price, quantity_on_hand')
        .eq('organization_id', orgId!)
        .eq('is_backroom_tracked', true)
        .eq('is_active', true);
      if (pErr) throw pErr;

      const productMap = new Map<string, typeof products extends (infer T)[] ? T : never>();
      for (const p of products ?? []) {
        productMap.set(p.id, p);
      }

      // 2. Get mix sessions in range
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id, started_at')
        .eq('organization_id', orgId!)
        .eq('status', 'completed')
        .gte('started_at', cutoffISO);
      if (locationId) sessionsQuery = sessionsQuery.eq('location_id', locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      const sessionDateMap = new Map<string, string>();
      for (const s of sessions ?? []) {
        sessionDateMap.set((s as any).id, (s as any).started_at);
      }

      if (!sessionIds.length) {
        // All products are dormant
        return Array.from(productMap.values()).map((p) => ({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          category: p.category,
          sessionsUsed: 0,
          totalDispensedGrams: 0,
          lastUsedDate: null,
          daysSinceLastUse: null,
          tier: 'dormant' as UsageTier,
          costPrice: p.cost_price,
          quantityOnHand: p.quantity_on_hand,
        }));
      }

      // 3. Get bowls for those sessions
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);
      if (bErr) throw bErr;

      const bowlIds = (bowls ?? []).map((b: any) => b.id);
      const bowlSessionMap = new Map<string, string>();
      for (const b of bowls ?? []) {
        bowlSessionMap.set((b as any).id, (b as any).mix_session_id);
      }

      if (!bowlIds.length) {
        return Array.from(productMap.values()).map((p) => ({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          category: p.category,
          sessionsUsed: 0,
          totalDispensedGrams: 0,
          lastUsedDate: null,
          daysSinceLastUse: null,
          tier: 'dormant' as UsageTier,
          costPrice: p.cost_price,
          quantityOnHand: p.quantity_on_hand,
        }));
      }

      // 4. Get bowl lines
      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('product_id, product_name_snapshot, brand_snapshot, dispensed_quantity, bowl_id')
        .in('bowl_id', bowlIds);
      if (lErr) throw lErr;

      // 5. Aggregate per product
      const aggMap = new Map<string, {
        name: string;
        brand: string | null;
        totalQty: number;
        sessionSet: Set<string>;
        lastDate: string | null;
      }>();

      for (const line of (lines ?? []) as any[]) {
        const pid = line.product_id ?? `snapshot:${line.product_name_snapshot}`;
        const sessionId = bowlSessionMap.get(line.bowl_id);
        const sessionDate = sessionId ? sessionDateMap.get(sessionId) ?? null : null;

        let agg = aggMap.get(pid);
        if (!agg) {
          const prod = line.product_id ? productMap.get(line.product_id) : null;
          agg = {
            name: prod?.name ?? line.product_name_snapshot ?? 'Unknown',
            brand: prod?.brand ?? line.brand_snapshot ?? null,
            totalQty: 0,
            sessionSet: new Set(),
            lastDate: null,
          };
          aggMap.set(pid, agg);
        }

        agg.totalQty += line.dispensed_quantity ?? 0;
        if (sessionId) agg.sessionSet.add(sessionId);
        if (sessionDate && (!agg.lastDate || sessionDate > agg.lastDate)) {
          agg.lastDate = sessionDate;
        }
      }

      // 6. Build result rows
      const now = Date.now();
      const results: ProductUsageRow[] = [];

      // Products with usage
      for (const [pid, agg] of aggMap) {
        const prod = productMap.get(pid);
        const daysSince = agg.lastDate
          ? Math.floor((now - new Date(agg.lastDate).getTime()) / 86_400_000)
          : null;

        results.push({
          productId: pid,
          productName: agg.name,
          brand: agg.brand,
          category: prod?.category ?? null,
          sessionsUsed: agg.sessionSet.size,
          totalDispensedGrams: Math.round(agg.totalQty * 10) / 10,
          lastUsedDate: agg.lastDate,
          daysSinceLastUse: daysSince,
          tier: classifyTier(agg.sessionSet.size, daysSince),
          costPrice: prod?.cost_price ?? null,
          quantityOnHand: prod?.quantity_on_hand ?? null,
        });
      }

      // Products with zero usage (dormant)
      for (const [pid, prod] of productMap) {
        if (!aggMap.has(pid)) {
          results.push({
            productId: pid,
            productName: prod.name,
            brand: prod.brand,
            category: prod.category,
            sessionsUsed: 0,
            totalDispensedGrams: 0,
            lastUsedDate: null,
            daysSinceLastUse: null,
            tier: 'dormant',
            costPrice: prod.cost_price,
            quantityOnHand: prod.quantity_on_hand,
          });
        }
      }

      return results;
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000,
  });
}
