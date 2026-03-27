/**
 * useBackroomHistory — Time-bucketed backroom metrics for trend charts.
 * Buckets mix_session data by day/week/month/year.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export type BucketMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface HistoryDataPoint {
  period: string;
  sessions: number;
  dispensedQty: number;
  wasteQty: number;
  wastePct: number;
  productCost: number;
  /** waste qty × avg cost-per-gram */
  estimatedWasteCost: number;
  /** % of bowls that have a reweigh event */
  reweighPct: number;
  /** dispensedQty / sessions */
  dispensedPerService: number;
  /** wasteQty / sessions */
  wastePerService: number;
  /** alias for wasteQty — semantic clarity for "Est. Product Wasted" toggle */
  estimatedProductWasted: number;
}

export function useBackroomHistory(
  startDate: string,
  endDate: string,
  bucketMode: BucketMode = 'daily',
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-history', orgId, startDate, endDate, bucketMode, locationId],
    queryFn: async (): Promise<HistoryDataPoint[]> => {
      // 1. Fetch sessions
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id, started_at, status')
        .eq('organization_id', orgId!)
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59')
        .order('started_at');

      if (locationId) sessionsQuery = sessionsQuery.eq('location_id', locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      if (!sessionIds.length) return [];

      // 2. Fetch bowls + lines
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);
      if (bErr) throw bErr;

      const bowlIds = (bowls ?? []).map((b: any) => b.id);

      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('bowl_id, dispensed_quantity, dispensed_cost_snapshot')
        .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']);
      if (lErr) throw lErr;

      // 3. Fetch waste
      const { data: wasteEvents, error: wErr } = await supabase
        .from('waste_events')
        .select('mix_session_id, quantity')
        .in('mix_session_id', sessionIds);
      if (wErr) throw wErr;

      // 4. Fetch reweigh events
      const { data: reweighEvents, error: rErr } = await supabase
        .from('reweigh_events')
        .select('bowl_id')
        .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']);
      if (rErr) throw rErr;

      // Build lookup maps
      const bowlSessionMap = new Map<string, string>();
      for (const b of (bowls ?? []) as any[]) bowlSessionMap.set(b.id, b.mix_session_id);

      // Session → dispensed aggregates
      const sessionDispensed = new Map<string, { qty: number; cost: number }>();
      for (const l of (lines ?? []) as any[]) {
        const sid = bowlSessionMap.get(l.bowl_id);
        if (!sid) continue;
        const existing = sessionDispensed.get(sid) ?? { qty: 0, cost: 0 };
        existing.qty += l.dispensed_quantity ?? 0;
        existing.cost += l.dispensed_cost_snapshot ?? 0;
        sessionDispensed.set(sid, existing);
      }

      // Session → waste
      const sessionWaste = new Map<string, number>();
      for (const w of (wasteEvents ?? []) as any[]) {
        sessionWaste.set(w.mix_session_id, (sessionWaste.get(w.mix_session_id) ?? 0) + (w.quantity ?? 0));
      }

      // Set of bowls that have been reweighed
      const reweighedBowlIds = new Set<string>();
      for (const r of (reweighEvents ?? []) as any[]) {
        reweighedBowlIds.add(r.bowl_id);
      }

      // Bucket sessions
      const bucketKey = (dateStr: string): string => {
        const d = new Date(dateStr);
        switch (bucketMode) {
          case 'daily': return format(d, 'yyyy-MM-dd');
          case 'weekly': return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          case 'monthly': return format(startOfMonth(d), 'yyyy-MM');
          case 'yearly': return format(d, 'yyyy');
        }
      };

      interface BucketData {
        sessions: number;
        dispensedQty: number;
        wasteQty: number;
        productCost: number;
        totalBowls: number;
        reweighedBowls: number;
      }

      const buckets = new Map<string, BucketData>();

      // Map session → bowls for reweigh counting
      const sessionBowlIds = new Map<string, string[]>();
      for (const b of (bowls ?? []) as any[]) {
        const list = sessionBowlIds.get(b.mix_session_id) ?? [];
        list.push(b.id);
        sessionBowlIds.set(b.mix_session_id, list);
      }

      for (const s of (sessions ?? []) as any[]) {
        const key = bucketKey(s.started_at);
        const existing = buckets.get(key) ?? { sessions: 0, dispensedQty: 0, wasteQty: 0, productCost: 0, totalBowls: 0, reweighedBowls: 0 };
        existing.sessions++;
        const disp = sessionDispensed.get(s.id);
        if (disp) {
          existing.dispensedQty += disp.qty;
          existing.productCost += disp.cost;
        }
        existing.wasteQty += sessionWaste.get(s.id) ?? 0;

        // Reweigh tracking
        const sBowls = sessionBowlIds.get(s.id) ?? [];
        existing.totalBowls += sBowls.length;
        existing.reweighedBowls += sBowls.filter(bid => reweighedBowlIds.has(bid)).length;

        buckets.set(key, existing);
      }

      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => {
          const dispensedQty = Math.round(data.dispensedQty * 100) / 100;
          const wasteQty = Math.round(data.wasteQty * 100) / 100;
          const productCost = Math.round(data.productCost * 100) / 100;
          const wastePct = dispensedQty > 0 ? Math.round((wasteQty / dispensedQty) * 1000) / 10 : 0;

          // Avg cost per gram for estimating waste cost
          const avgCostPerGram = dispensedQty > 0 ? productCost / dispensedQty : 0;
          const estimatedWasteCost = Math.round(wasteQty * avgCostPerGram * 100) / 100;

          const reweighPct = data.totalBowls > 0
            ? Math.round((data.reweighedBowls / data.totalBowls) * 1000) / 10
            : 0;

          const dispensedPerService = data.sessions > 0
            ? Math.round((dispensedQty / data.sessions) * 100) / 100
            : 0;

          const wastePerService = data.sessions > 0
            ? Math.round((wasteQty / data.sessions) * 100) / 100
            : 0;

          return {
            period,
            sessions: data.sessions,
            dispensedQty,
            wasteQty,
            wastePct,
            productCost,
            estimatedWasteCost,
            reweighPct,
            dispensedPerService,
            wastePerService,
            estimatedProductWasted: wasteQty,
          };
        });
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
