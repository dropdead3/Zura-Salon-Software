/**
 * useBackroomBrandUsage — Aggregates mix_bowl_lines by brand_snapshot for a date range.
 * Returns brand-level dispensed weight, cost, waste, and service count.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface BrandUsageRow {
  brand: string;
  dispensedQty: number;
  dispensedCost: number;
  wasteQty: number;
  serviceCount: number;
}

export function useBackroomBrandUsage(startDate: string, endDate: string, locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-brand-usage', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<BrandUsageRow[]> => {
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
      if (!sessionIds.length) return [];

      // 2. Fetch bowls for these sessions
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);
      if (bErr) throw bErr;

      const bowlIds = (bowls ?? []).map((b: any) => b.id);
      if (!bowlIds.length) return [];

      // 3. Fetch lines with brand_snapshot
      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('brand_snapshot, dispensed_quantity, dispensed_cost_snapshot, bowl_id')
        .in('bowl_id', bowlIds);
      if (lErr) throw lErr;

      // 4. Fetch waste events
      const { data: wasteEvents, error: wErr } = await supabase
        .from('waste_events')
        .select('product_id, quantity')
        .in('mix_session_id', sessionIds);
      if (wErr) throw wErr;

      // Get product->brand mapping for waste events
      const wasteProductIds = [...new Set((wasteEvents ?? []).map((w: any) => w.product_id).filter(Boolean))];
      let productBrandMap = new Map<string, string>();
      if (wasteProductIds.length) {
        const { data: products } = await supabase
          .from('products')
          .select('id, brand')
          .in('id', wasteProductIds);
        for (const p of (products ?? []) as any[]) {
          if (p.brand) productBrandMap.set(p.id, p.brand);
        }
      }

      // Build bowl→session map for service counting
      const bowlSessionMap = new Map<string, string>();
      for (const b of (bowls ?? []) as any[]) {
        bowlSessionMap.set(b.id, b.mix_session_id);
      }

      // 5. Aggregate by brand
      const brandMap = new Map<string, { dispensedQty: number; dispensedCost: number; wasteQty: number; sessionIds: Set<string> }>();

      for (const line of (lines ?? []) as any[]) {
        const brand = line.brand_snapshot || 'Unknown';
        const existing = brandMap.get(brand) ?? { dispensedQty: 0, dispensedCost: 0, wasteQty: 0, sessionIds: new Set() };
        existing.dispensedQty += line.dispensed_quantity ?? 0;
        existing.dispensedCost += line.dispensed_cost_snapshot ?? 0;
        const sessionId = bowlSessionMap.get(line.bowl_id);
        if (sessionId) existing.sessionIds.add(sessionId);
        brandMap.set(brand, existing);
      }

      // Add waste by brand
      for (const w of (wasteEvents ?? []) as any[]) {
        const brand = productBrandMap.get(w.product_id) || 'Unknown';
        const existing = brandMap.get(brand) ?? { dispensedQty: 0, dispensedCost: 0, wasteQty: 0, sessionIds: new Set() };
        existing.wasteQty += w.quantity ?? 0;
        brandMap.set(brand, existing);
      }

      return Array.from(brandMap.entries())
        .map(([brand, data]) => ({
          brand,
          dispensedQty: Math.round(data.dispensedQty * 100) / 100,
          dispensedCost: Math.round(data.dispensedCost * 100) / 100,
          wasteQty: Math.round(data.wasteQty * 100) / 100,
          serviceCount: data.sessionIds.size,
        }))
        .sort((a, b) => b.dispensedCost - a.dispensedCost);
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
