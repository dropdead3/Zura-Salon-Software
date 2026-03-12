/**
 * useBackroomAnalytics — Aggregates backroom metrics for a date range.
 * Real-time computation from raw tables; falls back to snapshots for historical.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  calculateChemicalCostPerService,
  calculateWastePercentage,
  calculateReweighCompliance,
  type StaffSessionData,
} from '@/lib/backroom/analytics-engine';

export interface BackroomAnalyticsData {
  totalSessions: number;
  completedSessions: number;
  avgSessionDurationMinutes: number;
  totalProductCost: number;
  avgChemicalCostPerService: number;
  totalWasteQty: number;
  totalDispensedQty: number;
  wastePct: number;
  wasteByCategory: Record<string, number>;
  bowlsRequiringReweigh: number;
  bowlsReweighed: number;
  reweighCompliancePct: number;
  sessionsWithVariance: number;
  totalOverageQty: number;
  totalUnderageQty: number;
  staffData: StaffSessionData[];
}

export function useBackroomAnalytics(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-analytics', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<BackroomAnalyticsData> => {
      // 1. Fetch sessions in range
      let sessionsQuery = supabase
        .from('mix_sessions')
        .select('id, status, mixed_by_staff_id, started_at, completed_at, location_id')
        .eq('organization_id', orgId!)
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');

      if (locationId) sessionsQuery = sessionsQuery.eq('location_id', locationId);

      const { data: sessions, error: sErr } = await sessionsQuery;
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s: any) => s.id);
      if (!sessionIds.length) {
        return emptyResult();
      }

      // 2. Fetch bowls + lines
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id, status')
        .in('mix_session_id', sessionIds);
      if (bErr) throw bErr;

      const bowlIds = (bowls ?? []).map((b: any) => b.id);

      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('bowl_id, dispensed_quantity, product_id')
        .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']);
      if (lErr) throw lErr;

      // 3. Fetch waste events
      const { data: wasteEvents, error: wErr } = await supabase
        .from('waste_events')
        .select('waste_category, quantity')
        .in('mix_session_id', sessionIds);
      if (wErr) throw wErr;

      // 4. Fetch reweigh events
      const { data: reweighEvents, error: rErr } = await supabase
        .from('reweigh_events')
        .select('bowl_id')
        .in('bowl_id', bowlIds.length ? bowlIds : ['__none__']);
      if (rErr) throw rErr;

      // 5. Fetch product costs for dispensed products
      const productIds = [...new Set((lines ?? []).map((l: any) => l.product_id).filter(Boolean))];
      let productCostMap = new Map<string, number>();
      if (productIds.length) {
        const { data: products } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);
        for (const p of (products ?? []) as any[]) {
          productCostMap.set(p.id, p.cost_price ?? 0);
        }
      }

      // ── Compute metrics ──
      const completedSessions = (sessions ?? []).filter((s: any) => s.status === 'completed');
      const totalDispensedQty = (lines ?? []).reduce((sum: number, l: any) => sum + (l.dispensed_quantity ?? 0), 0);
      const totalProductCost = (lines ?? []).reduce((sum: number, l: any) => {
        const cost = productCostMap.get(l.product_id) ?? 0;
        return sum + (l.dispensed_quantity ?? 0) * cost;
      }, 0);

      // Waste
      const totalWasteQty = (wasteEvents ?? []).reduce((sum: number, w: any) => sum + (w.quantity ?? 0), 0);
      const wasteByCategory: Record<string, number> = {};
      for (const w of (wasteEvents ?? []) as any[]) {
        wasteByCategory[w.waste_category] = (wasteByCategory[w.waste_category] ?? 0) + (w.quantity ?? 0);
      }

      // Reweigh
      const nonDiscardedBowls = (bowls ?? []).filter((b: any) => b.status !== 'discarded');
      const reweighedBowlIds = new Set((reweighEvents ?? []).map((r: any) => r.bowl_id));
      const bowlsReweighed = nonDiscardedBowls.filter((b: any) => reweighedBowlIds.has(b.id)).length;

      // Duration
      let totalDuration = 0;
      for (const s of completedSessions as any[]) {
        if (s.started_at && s.completed_at) {
          totalDuration += (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000;
        }
      }

      // Staff aggregation
      const staffMap = new Map<string, StaffSessionData>();
      const sessionBowlMap = new Map<string, string[]>();
      for (const b of (bowls ?? []) as any[]) {
        const list = sessionBowlMap.get(b.mix_session_id) ?? [];
        list.push(b.id);
        sessionBowlMap.set(b.mix_session_id, list);
      }

      for (const s of (sessions ?? []) as any[]) {
        const staffId = s.mixed_by_staff_id;
        if (!staffId) continue;
        const existing = staffMap.get(staffId) ?? {
          staffUserId: staffId,
          staffName: staffId,
          sessionCount: 0,
          totalDurationMinutes: 0,
          totalWasteQty: 0,
          totalDispensedQty: 0,
          totalOverageQty: 0,
          totalUnderageQty: 0,
          bowlsTotal: 0,
          bowlsReweighed: 0,
        };
        existing.sessionCount++;
        if (s.started_at && s.completed_at) {
          existing.totalDurationMinutes += (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000;
        }
        const sBowls = sessionBowlMap.get(s.id) ?? [];
        existing.bowlsTotal += sBowls.length;
        existing.bowlsReweighed += sBowls.filter((bid) => reweighedBowlIds.has(bid)).length;
        staffMap.set(staffId, existing);
      }

      return {
        totalSessions: (sessions ?? []).length,
        completedSessions: completedSessions.length,
        avgSessionDurationMinutes: completedSessions.length > 0 ? Math.round((totalDuration / completedSessions.length) * 10) / 10 : 0,
        totalProductCost: Math.round(totalProductCost * 100) / 100,
        avgChemicalCostPerService: calculateChemicalCostPerService({
          totalProductCost,
          completedServiceCount: completedSessions.length,
        }),
        totalWasteQty,
        totalDispensedQty,
        wastePct: calculateWastePercentage({ totalWasteQty, totalDispensedQty }),
        wasteByCategory,
        bowlsRequiringReweigh: nonDiscardedBowls.length,
        bowlsReweighed,
        reweighCompliancePct: calculateReweighCompliance({
          totalBowls: nonDiscardedBowls.length,
          reweighedBowls: bowlsReweighed,
        }),
        sessionsWithVariance: 0, // computed separately via useUsageVariance
        totalOverageQty: 0,
        totalUnderageQty: 0,
        staffData: Array.from(staffMap.values()),
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}

function emptyResult(): BackroomAnalyticsData {
  return {
    totalSessions: 0,
    completedSessions: 0,
    avgSessionDurationMinutes: 0,
    totalProductCost: 0,
    avgChemicalCostPerService: 0,
    totalWasteQty: 0,
    totalDispensedQty: 0,
    wastePct: 0,
    wasteByCategory: {},
    bowlsRequiringReweigh: 0,
    bowlsReweighed: 0,
    reweighCompliancePct: 100,
    sessionsWithVariance: 0,
    totalOverageQty: 0,
    totalUnderageQty: 0,
    staffData: [],
  };
}
