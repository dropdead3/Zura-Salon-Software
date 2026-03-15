/**
 * useBackroomHistory — Time-bucketed backroom metrics for trend charts.
 * Buckets mix_session data by day/week/month.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export type BucketMode = 'daily' | 'weekly' | 'monthly';

export interface HistoryDataPoint {
  period: string;
  sessions: number;
  dispensedQty: number;
  wasteQty: number;
  wastePct: number;
  productCost: number;
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

      // Bucket sessions
      const bucketKey = (dateStr: string): string => {
        const d = new Date(dateStr);
        switch (bucketMode) {
          case 'daily': return format(d, 'yyyy-MM-dd');
          case 'weekly': return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          case 'monthly': return format(startOfMonth(d), 'yyyy-MM');
        }
      };

      const buckets = new Map<string, { sessions: number; dispensedQty: number; wasteQty: number; productCost: number }>();

      for (const s of (sessions ?? []) as any[]) {
        const key = bucketKey(s.started_at);
        const existing = buckets.get(key) ?? { sessions: 0, dispensedQty: 0, wasteQty: 0, productCost: 0 };
        existing.sessions++;
        const disp = sessionDispensed.get(s.id);
        if (disp) {
          existing.dispensedQty += disp.qty;
          existing.productCost += disp.cost;
        }
        existing.wasteQty += sessionWaste.get(s.id) ?? 0;
        buckets.set(key, existing);
      }

      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data]) => ({
          period,
          sessions: data.sessions,
          dispensedQty: Math.round(data.dispensedQty * 100) / 100,
          wasteQty: Math.round(data.wasteQty * 100) / 100,
          wastePct: data.dispensedQty > 0 ? Math.round((data.wasteQty / data.dispensedQty) * 1000) / 10 : 0,
          productCost: Math.round(data.productCost * 100) / 100,
        }));
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
