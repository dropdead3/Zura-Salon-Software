/**
 * AnalyticsService — Owns reporting snapshot writes.
 *
 * Wraps the pure analytics-engine calculations and reads from projections.
 * Writes only to: backroom_analytics_snapshots, service_profitability_snapshots,
 *                  staff_backroom_performance.
 *
 * Must not mutate operational tables (mix_sessions, stock_movements, etc.).
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateChemicalCostPerService,
  calculateWastePercentage,
  calculateReweighCompliance,
  calculateGhostLoss,
  calculateContributionMargin,
  calculateStaffEfficiency,
  calculateInventoryDaysRemaining,
  calculateMixConfidence,
} from '@/lib/backroom/analytics-engine';

// Re-export calculation functions for convenience
export {
  calculateChemicalCostPerService,
  calculateWastePercentage,
  calculateReweighCompliance,
  calculateGhostLoss,
  calculateContributionMargin,
  calculateStaffEfficiency,
  calculateInventoryDaysRemaining,
  calculateMixConfidence,
};

/**
 * Read the latest analytics snapshot for an organization.
 */
export async function getLatestSnapshot(orgId: string, locationId?: string | null) {
  let query = supabase
    .from('backroom_analytics_snapshots')
    .select('*')
    .eq('organization_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(1);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as any)?.[0] ?? null;
}

/**
 * Read service profitability snapshots for a date range.
 */
export async function getServiceProfitability(
  orgId: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('service_profitability_snapshots' as any)
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Read staff backroom performance for a period.
 */
export async function getStaffPerformance(
  orgId: string,
  periodStart?: string,
  periodEnd?: string
) {
  let query = supabase
    .from('staff_backroom_performance' as any)
    .select('*')
    .eq('organization_id', orgId)
    .order('last_calculated_at', { ascending: false });

  if (periodStart) query = query.gte('period_start', periodStart);
  if (periodEnd) query = query.lte('period_end', periodEnd);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}
