/**
 * useContributionMargin — Service profitability: revenue - product cost - labor.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { calculateContributionMargin, type ContributionMarginResult } from '@/lib/backroom/analytics-engine';

export interface ServiceContributionMargin extends ContributionMarginResult {
  serviceCategory: string;
  serviceRevenue: number;
  productCost: number;
  laborEstimate: number;
  sessionCount: number;
}

export function useContributionMargin(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['contribution-margin', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<ServiceContributionMargin[]> => {
      // 1. Fetch completed sessions with appointment data
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id, appointment_id, service_id, location_id')
        .eq('organization_id', orgId!)
        .eq('status', 'completed')
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');

      if (locationId) sessionsQuery = sessionsQuery.eq('location_id', locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;
      if (!(sessions ?? []).length) return [];

      const sessionIds = (sessions as any[]).map((s) => s.id);
      const serviceIds = [...new Set((sessions as any[]).map((s) => s.service_id).filter(Boolean))];

      // 2. Fetch services for revenue + labor
      let serviceMap = new Map<string, { name: string; category: string; price: number; cost: number }>();
      if (serviceIds.length) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, category, price, cost')
          .in('id', serviceIds);
        for (const svc of (services ?? []) as any[]) {
          serviceMap.set(svc.id, {
            name: svc.name,
            category: svc.category ?? 'Uncategorized',
            price: svc.price ?? 0,
            cost: svc.cost ?? 0,
          });
        }
      }

      // 3. Fetch bowls + lines for product cost
      const { data: bowls } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds)
        .neq('status', 'discarded');

      const bowlSessionMap = new Map<string, string>();
      for (const b of (bowls ?? []) as any[]) {
        bowlSessionMap.set(b.id, b.mix_session_id);
      }

      const bowlIds = (bowls ?? []).map((b: any) => b.id);
      const { data: lines } = await supabase
        .from('mix_bowl_lines')
        .select('bowl_id, dispensed_quantity, product_id')
        .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']);

      const productIds = [...new Set((lines ?? []).map((l: any) => l.product_id).filter(Boolean))];
      const productCostMap = new Map<string, number>();
      if (productIds.length) {
        const { data: products } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);
        for (const p of (products ?? []) as any[]) {
          productCostMap.set(p.id, p.cost_price ?? 0);
        }
      }

      // 4. Aggregate by service category
      const categoryMap = new Map<string, {
        category: string;
        revenue: number;
        productCost: number;
        laborEstimate: number;
        count: number;
      }>();

      // Map session → product cost
      const sessionProductCost = new Map<string, number>();
      for (const l of (lines ?? []) as any[]) {
        const sessionId = bowlSessionMap.get(l.bowl_id);
        if (!sessionId) continue;
        const cost = (productCostMap.get(l.product_id) ?? 0) * (l.dispensed_quantity ?? 0);
        sessionProductCost.set(sessionId, (sessionProductCost.get(sessionId) ?? 0) + cost);
      }

      for (const s of (sessions ?? []) as any[]) {
        const svc = serviceMap.get(s.service_id);
        const cat = svc?.category ?? 'Uncategorized';
        const existing = categoryMap.get(cat) ?? {
          category: cat,
          revenue: 0,
          productCost: 0,
          laborEstimate: 0,
          count: 0,
        };
        existing.revenue += svc?.price ?? 0;
        existing.productCost += sessionProductCost.get(s.id) ?? 0;
        existing.laborEstimate += svc?.cost ?? 0;
        existing.count++;
        categoryMap.set(cat, existing);
      }

      // 5. Calculate margins
      return Array.from(categoryMap.values()).map((c) => {
        const margin = calculateContributionMargin({
          serviceRevenue: c.revenue,
          productCost: c.productCost,
          laborEstimate: c.laborEstimate,
        });
        return {
          serviceCategory: c.category,
          serviceRevenue: Math.round(c.revenue * 100) / 100,
          productCost: Math.round(c.productCost * 100) / 100,
          laborEstimate: Math.round(c.laborEstimate * 100) / 100,
          sessionCount: c.count,
          ...margin,
        };
      }).sort((a, b) => b.contributionMargin - a.contributionMargin);
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
