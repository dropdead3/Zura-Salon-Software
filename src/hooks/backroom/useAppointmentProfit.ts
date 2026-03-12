/**
 * useAppointmentProfit — Enriched per-appointment profitability data.
 * Reads from service_profitability_snapshots and enriches with labor estimates.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  calculateAppointmentProfit,
  rankServicesByMargin,
  detectMarginOutliers,
  getMarginHealth,
  type EnrichedAppointmentProfit,
  type ServiceMarginRanking,
  type MarginOutlier,
} from '@/lib/backroom/appointment-profit-engine';

export function useAppointmentProfit(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['appointment-profit', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<EnrichedAppointmentProfit[]> => {
      // 1. Fetch snapshots
      let snapQuery = supabase
        .from('service_profitability_snapshots')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (locationId) snapQuery = snapQuery.eq('location_id', locationId);

      const { data: snapshots, error: snapErr } = await snapQuery;
      if (snapErr) throw snapErr;
      if (!(snapshots ?? []).length) return [];

      // 2. Get unique service names to fetch labor data from services table
      const serviceNames = [
        ...new Set((snapshots as any[]).map((s) => s.service_name).filter(Boolean)),
      ];

      const serviceMap = new Map<string, { cost: number; durationMinutes: number }>();
      if (serviceNames.length) {
        const { data: services } = await supabase
          .from('services')
          .select('name, cost, duration_minutes')
          .eq('organization_id', orgId!)
          .in('name', serviceNames);

        for (const svc of (services ?? []) as any[]) {
          serviceMap.set(svc.name, {
            cost: svc.cost ?? 0,
            durationMinutes: svc.duration_minutes ?? 0,
          });
        }
      }

      // 3. Enrich each snapshot with labor estimate
      return (snapshots as any[]).map((snap) => {
        const svc = serviceMap.get(snap.service_name);
        const laborEstimate = svc?.cost ?? 0;
        const hasMixData = (snap.product_cost ?? 0) > 0 || (snap.waste_cost ?? 0) > 0;

        const profit = calculateAppointmentProfit({
          serviceRevenue: snap.service_revenue ?? 0,
          chemicalCost: snap.product_cost ?? 0,
          laborEstimate,
          wasteCost: snap.waste_cost ?? 0,
        });

        return {
          snapshotId: snap.id,
          appointmentId: snap.appointment_id,
          staffId: snap.staff_id,
          serviceName: snap.service_name,
          serviceRevenue: profit.serviceRevenue,
          chemicalCost: profit.chemicalCost,
          laborEstimate: profit.laborEstimate,
          wasteCost: profit.wasteCost,
          contributionMargin: profit.contributionMargin,
          marginPct: profit.marginPct,
          health: profit.health,
          laborConfigured: laborEstimate > 0,
          hasMixData,
          createdAt: snap.created_at,
        } satisfies EnrichedAppointmentProfit;
      });
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}

export interface AppointmentProfitSummary {
  totalAppointments: number;
  avgMarginPct: number;
  avgMargin: number;
  totalRevenue: number;
  totalMargin: number;
  highestMarginService: ServiceMarginRanking | null;
  lowestMarginService: ServiceMarginRanking | null;
  serviceRankings: ServiceMarginRanking[];
  outliers: MarginOutlier[];
  trendByDay: { date: string; avgMarginPct: number; count: number; totalMargin: number }[];
}

export function useAppointmentProfitSummary(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const profitQuery = useAppointmentProfit(startDate, endDate, locationId);

  return useQuery({
    queryKey: ['appointment-profit-summary', startDate, endDate, locationId],
    queryFn: (): AppointmentProfitSummary => {
      const data = profitQuery.data!;
      const totalAppointments = data.length;

      const totalRevenue = data.reduce((s, a) => s + a.serviceRevenue, 0);
      const totalMargin = data.reduce((s, a) => s + a.contributionMargin, 0);
      const avgMarginPct = totalRevenue > 0
        ? Math.round((totalMargin / totalRevenue) * 1000) / 10
        : 0;
      const avgMargin = totalAppointments > 0
        ? Math.round((totalMargin / totalAppointments) * 100) / 100
        : 0;

      const serviceRankings = rankServicesByMargin(data);
      const outliers = detectMarginOutliers(data);

      // Trend by day
      const dayMap = new Map<string, { total: number; count: number; revenue: number }>();
      for (const a of data) {
        const day = a.createdAt.substring(0, 10);
        const existing = dayMap.get(day) ?? { total: 0, count: 0, revenue: 0 };
        existing.total += a.contributionMargin;
        existing.revenue += a.serviceRevenue;
        existing.count++;
        dayMap.set(day, existing);
      }

      const trendByDay = Array.from(dayMap.entries())
        .map(([date, d]) => ({
          date,
          avgMarginPct: d.revenue > 0 ? Math.round((d.total / d.revenue) * 1000) / 10 : 0,
          count: d.count,
          totalMargin: Math.round(d.total * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalAppointments,
        avgMarginPct,
        avgMargin,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
        highestMarginService: serviceRankings[0] ?? null,
        lowestMarginService: serviceRankings[serviceRankings.length - 1] ?? null,
        serviceRankings,
        outliers,
        trendByDay,
      };
    },
    enabled: !!profitQuery.data?.length,
    staleTime: 5 * 60_000,
  });
}
