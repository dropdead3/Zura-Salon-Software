/**
 * ServiceIntelligenceService — Orchestrates data fetching + calculation
 * for Adaptive Service Intelligence.
 *
 * Reads from: service_profitability_snapshots, staff_backroom_performance,
 *             mix_sessions, services.
 * Writes nothing. Pure read-only.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateServiceProfiles,
  detectOptimizations,
  type ServiceSessionData,
  type StaffServiceUsage,
  type ServiceProfile,
  type OptimizationInsight,
  type CostTrendPeriod,
} from '@/lib/backroom/service-intelligence-engine';

/**
 * Fetch and compute service profiles for a date range.
 */
export async function fetchServiceProfiles(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string
): Promise<ServiceProfile[]> {
  // 1. Fetch profitability snapshots
  let query = supabase
    .from('service_profitability_snapshots')
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  if (locationId) query = query.eq('location_id', locationId);

  const { data: snapshots, error: snapErr } = await query;
  if (snapErr) throw snapErr;
  if (!(snapshots ?? []).length) return [];

  // 2. Build session data from snapshots
  const sessions: ServiceSessionData[] = (snapshots as any[])
    .filter((s) => s.service_name)
    .map((s) => ({
      serviceName: s.service_name,
      staffId: s.staff_id ?? 'unknown',
      serviceRevenue: s.service_revenue ?? 0,
      productCost: s.product_cost ?? 0,
      wasteCost: s.waste_cost ?? 0,
      overageRevenue: s.overage_revenue ?? 0,
      durationMinutes: 0, // will use default
      dispensedQty: (s.product_cost ?? 0) > 0 ? (s.product_cost ?? 0) * 10 : 0, // estimate from cost
      wasteQty: (s.waste_cost ?? 0) > 0 ? (s.waste_cost ?? 0) * 10 : 0,
      reweighCompliant: true, // default
    }));

  // 3. Build staff usage aggregates
  const staffUsageMap = new Map<string, StaffServiceUsage>();
  for (const s of sessions) {
    const key = `${s.staffId}::${s.serviceName}`;
    const existing = staffUsageMap.get(key);
    if (existing) {
      existing.totalUsage += s.dispensedQty;
      existing.sessionCount += 1;
    } else {
      staffUsageMap.set(key, {
        staffId: s.staffId,
        serviceName: s.serviceName,
        totalUsage: s.dispensedQty,
        sessionCount: 1,
      });
    }
  }

  // 4. Enrich with mix session durations where available
  const serviceNames = [...new Set(sessions.map((s) => s.serviceName))];
  if (serviceNames.length > 0) {
    const { data: mixSessions } = await supabase
      .from('mix_sessions')
      .select('id, service_id, started_at, completed_at')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('started_at', startDate)
      .lte('started_at', endDate + 'T23:59:59');

    // Get services for name→duration mapping
    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('organization_id', orgId);

    const serviceNameDuration = new Map<string, number>();
    for (const svc of (services ?? []) as any[]) {
      if (svc.name && svc.duration_minutes) {
        serviceNameDuration.set(svc.name, svc.duration_minutes);
      }
    }

    // Apply duration data to sessions
    for (const s of sessions) {
      s.durationMinutes = serviceNameDuration.get(s.serviceName) ?? 60;
    }
  }

  return calculateServiceProfiles(sessions, Array.from(staffUsageMap.values()));
}

/**
 * Generate optimization insights for a date range.
 */
export async function generateOptimizationInsights(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string
): Promise<OptimizationInsight[]> {
  const profiles = await fetchServiceProfiles(orgId, startDate, endDate, locationId);
  if (!profiles.length) return [];

  // Attempt to build cost trend data from snapshots (3 periods)
  const costTrends = await fetchCostTrends(orgId, startDate, endDate, locationId);

  return detectOptimizations(profiles, costTrends);
}

/**
 * Fetch cost trend data by splitting the date range into 3 periods.
 */
async function fetchCostTrends(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string
): Promise<CostTrendPeriod[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const periodDays = Math.floor(totalDays / 3);
  if (periodDays < 1) return [];

  const periods: CostTrendPeriod[] = [];

  for (let i = 0; i < 3; i++) {
    const pStart = new Date(start.getTime() + i * periodDays * 86400000);
    const pEnd = new Date(start.getTime() + (i + 1) * periodDays * 86400000 - 1);

    let q = supabase
      .from('service_profitability_snapshots')
      .select('service_name, product_cost')
      .eq('organization_id', orgId)
      .gte('created_at', pStart.toISOString().slice(0, 10))
      .lte('created_at', pEnd.toISOString().slice(0, 10) + 'T23:59:59');

    if (locationId) q = q.eq('location_id', locationId);

    const { data } = await q;
    if (!data?.length) continue;

    // Group by service name
    const serviceGroups = new Map<string, number[]>();
    for (const row of data as any[]) {
      if (!row.service_name) continue;
      const arr = serviceGroups.get(row.service_name) ?? [];
      arr.push(row.product_cost ?? 0);
      serviceGroups.set(row.service_name, arr);
    }

    for (const [name, costs] of serviceGroups) {
      const avg = costs.reduce((s, c) => s + c, 0) / costs.length;
      periods.push({ serviceName: name, periodIndex: i, avgCost: avg });
    }
  }

  return periods;
}
