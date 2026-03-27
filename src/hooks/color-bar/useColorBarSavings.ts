/**
 * useBackroomSavings — Unified hook that aggregates all savings categories
 * from backroom analytics snapshots and checkout usage charges.
 * Supports configurable period (7/30/90 days) and all-time cumulative totals.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useColorBarOrgId';

/** Industry baseline: ~12% waste rate on color spend */
const BASELINE_WASTE_RATE = 0.12;

export interface SavingsCategory {
  key: string;
  label: string;
  amount: number;
  explanation: string;
  formula: string;
  /** Contextual message when amount is $0 */
  zeroMessage?: string;
}

export interface BackroomSavingsData {
  totalSavings: number;
  categories: SavingsCategory[];
  avgCostPerService: number;
  actualWastePct: number;
  snapshotCount: number;
  hasEnoughData: boolean;
  /** Subscription cost passed through for ROI comparison */
  subscriptionCost: number;
  /** totalSavings - subscriptionCost */
  netBenefit: number;
  /** Waste reduction percentage vs baseline */
  wasteReduction: number;
}

export interface AllTimeSavingsData {
  totalSavings: number;
  daysCovered: number;
}

function computeSavings(
  snapshots: any[],
  charges: any[],
  days: number,
  subscriptionCost: number,
): BackroomSavingsData {
  const count = snapshots.length;

  if (count < 7) {
    return {
      totalSavings: 0,
      categories: [],
      avgCostPerService: 0,
      actualWastePct: 0,
      snapshotCount: count,
      hasEnoughData: false,
      subscriptionCost,
      netBenefit: -subscriptionCost,
      wasteReduction: 0,
    };
  }

  // --- Waste Reduction ---
  const avgWastePct = snapshots.reduce((s, r) => s + (r.waste_pct ?? 0), 0) / count;
  const avgProductCost = snapshots.reduce((s, r) => s + (r.total_product_cost ?? 0), 0) / count;
  const wasteReduction = Math.max(0, BASELINE_WASTE_RATE - avgWastePct / 100);
  const wasteSavings = Math.round(wasteReduction * avgProductCost * days * 100) / 100;

  // --- Ghost Product Recovery ---
  const ghostSavings = Math.round(
    snapshots.reduce((s, r) => s + (r.ghost_loss_cost ?? 0), 0) * 100,
  ) / 100;

  // --- Supply Cost Recovery ---
  const supplySavings = Math.round(
    charges
      .filter((c) => c.status === 'approved')
      .reduce((s, c) => s + (c.charge_amount ?? 0), 0) * 100,
  ) / 100;

  // --- Avg cost per service ---
  const avgCostPerService =
    Math.round(
      (snapshots.reduce((s, r) => s + (r.avg_chemical_cost_per_service ?? 0), 0) / count) * 100,
    ) / 100;

  const categories: SavingsCategory[] = [
    {
      key: 'waste',
      label: 'Waste Reduction',
      amount: wasteSavings,
      explanation: `Industry average waste is 12%. Your backroom tracks at ${avgWastePct.toFixed(1)}%. That difference saves you money every month on product that would have been thrown away.`,
      formula: `(12% baseline − your waste%) × avg daily product cost × ${days} days`,
      zeroMessage: 'Your waste rate is already at or below the industry average — great job!',
    },
    {
      key: 'ghost',
      label: 'Ghost Product Recovery',
      amount: ghostSavings,
      explanation:
        'Product that went missing without being logged to a service. Zura detected these discrepancies between expected and actual inventory depletion.',
      formula: `Sum of unaccounted product cost detected over the last ${days} days`,
      zeroMessage: 'No unaccounted product loss detected — your inventory is airtight.',
    },
    {
      key: 'supply',
      label: 'Supply Cost Recovery',
      amount: supplySavings,
      explanation:
        'Overage charges collected from clients when they exceed their service allowance. This is revenue that would otherwise come out of your margin.',
      formula: `Sum of approved overage charges in the last ${days} days`,
      zeroMessage:
        'No overage charges recorded yet. Enable service allowance policies to start recovering supply costs.',
    },
  ];

  const totalSavings = Math.round((wasteSavings + ghostSavings + supplySavings) * 100) / 100;
  const netBenefit = Math.round((totalSavings - subscriptionCost) * 100) / 100;

  return {
    totalSavings,
    categories,
    avgCostPerService,
    actualWastePct: Math.round(avgWastePct * 10) / 10,
    snapshotCount: count,
    hasEnoughData: true,
    subscriptionCost,
    netBenefit,
    wasteReduction: Math.round(wasteReduction * 1000) / 10,
  };
}

export function useBackroomSavings(days: number = 30, subscriptionMonthlyCost: number = 0) {
  const orgId = useBackroomOrgId();

  const periodQuery = useQuery<BackroomSavingsData>({
    queryKey: ['backroom-savings', orgId, days, subscriptionMonthlyCost],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const [snapshotsRes, chargesRes] = await Promise.all([
        supabase
          .from('backroom_analytics_snapshots')
          .select('waste_pct, total_product_cost, ghost_loss_cost, avg_chemical_cost_per_service')
          .eq('organization_id', orgId)
          .gte('snapshot_date', startStr)
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('checkout_usage_charges')
          .select('charge_amount, status')
          .eq('organization_id', orgId)
          .gte('created_at', `${startStr}T00:00:00`),
      ]);

      if (snapshotsRes.error) throw snapshotsRes.error;
      if (chargesRes.error) throw chargesRes.error;

      return computeSavings(
        snapshotsRes.data ?? [],
        chargesRes.data ?? [],
        days,
        subscriptionMonthlyCost,
      );
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
  });

  // All-time cumulative savings (no date filter)
  const allTimeQuery = useQuery<AllTimeSavingsData>({
    queryKey: ['backroom-savings-alltime', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      const [snapshotsRes, chargesRes] = await Promise.all([
        supabase
          .from('backroom_analytics_snapshots')
          .select('waste_pct, total_product_cost, ghost_loss_cost, avg_chemical_cost_per_service, snapshot_date')
          .eq('organization_id', orgId)
          .order('snapshot_date', { ascending: true }),
        supabase
          .from('checkout_usage_charges')
          .select('charge_amount, status')
          .eq('organization_id', orgId),
      ]);

      if (snapshotsRes.error) throw snapshotsRes.error;
      if (chargesRes.error) throw chargesRes.error;

      const snapshots = snapshotsRes.data ?? [];
      const charges = chargesRes.data ?? [];

      if (snapshots.length < 7) {
        return { totalSavings: 0, daysCovered: snapshots.length };
      }

      // Use all-time span in days for waste calc
      const firstDate = new Date(snapshots[0].snapshot_date);
      const lastDate = new Date(snapshots[snapshots.length - 1].snapshot_date);
      const spanDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000));

      const result = computeSavings(snapshots, charges, spanDays, 0);
      return { totalSavings: result.totalSavings, daysCovered: snapshots.length };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 30,
  });

  return {
    data: periodQuery.data,
    isLoading: periodQuery.isLoading,
    allTime: allTimeQuery.data,
    allTimeLoading: allTimeQuery.isLoading,
  };
}
