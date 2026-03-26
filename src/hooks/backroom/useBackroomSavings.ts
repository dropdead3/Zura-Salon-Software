/**
 * useBackroomSavings — Unified hook that aggregates all savings categories
 * from backroom analytics snapshots and checkout usage charges.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

/** Industry baseline: ~12% waste rate on color spend */
const BASELINE_WASTE_RATE = 0.12;

export interface SavingsCategory {
  key: string;
  label: string;
  amount: number;
  explanation: string;
  formula: string;
}

export interface BackroomSavingsData {
  totalSavings: number;
  categories: SavingsCategory[];
  avgCostPerService: number;
  actualWastePct: number;
  snapshotCount: number;
  hasEnoughData: boolean;
}

export function useBackroomSavings() {
  const orgId = useBackroomOrgId();

  return useQuery<BackroomSavingsData>({
    queryKey: ['backroom-savings', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Fetch snapshots and charges in parallel
      const [snapshotsRes, chargesRes] = await Promise.all([
        supabase
          .from('backroom_analytics_snapshots')
          .select('waste_pct, total_product_cost, ghost_loss_cost, avg_chemical_cost_per_service')
          .eq('organization_id', orgId)
          .gte('snapshot_date', startDate)
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('checkout_usage_charges')
          .select('charge_amount, status')
          .eq('organization_id', orgId)
          .gte('created_at', `${startDate}T00:00:00`),
      ]);

      if (snapshotsRes.error) throw snapshotsRes.error;
      if (chargesRes.error) throw chargesRes.error;

      const snapshots = snapshotsRes.data ?? [];
      const charges = chargesRes.data ?? [];
      const count = snapshots.length;

      if (count < 7) {
        return {
          totalSavings: 0,
          categories: [],
          avgCostPerService: 0,
          actualWastePct: 0,
          snapshotCount: count,
          hasEnoughData: false,
        };
      }

      // --- Waste Reduction ---
      const avgWastePct = snapshots.reduce((s, r) => s + (r.waste_pct ?? 0), 0) / count;
      const avgProductCost = snapshots.reduce((s, r) => s + (r.total_product_cost ?? 0), 0) / count;
      const wasteReduction = Math.max(0, BASELINE_WASTE_RATE - avgWastePct / 100);
      const wasteSavings = Math.round(wasteReduction * avgProductCost * 30 * 100) / 100;

      // --- Ghost Product Recovery ---
      const ghostSavings = Math.round(
        snapshots.reduce((s, r) => s + (r.ghost_loss_cost ?? 0), 0) * 100
      ) / 100;

      // --- Supply Cost Recovery ---
      const supplySavings = Math.round(
        charges
          .filter((c) => c.status === 'approved')
          .reduce((s, c) => s + (c.charge_amount ?? 0), 0) * 100
      ) / 100;

      // --- Avg cost per service ---
      const avgCostPerService =
        Math.round(
          (snapshots.reduce((s, r) => s + (r.avg_chemical_cost_per_service ?? 0), 0) / count) * 100
        ) / 100;

      const categories: SavingsCategory[] = [
        {
          key: 'waste',
          label: 'Waste Reduction',
          amount: wasteSavings,
          explanation: `Industry average waste is 12%. Your backroom tracks at ${(avgWastePct).toFixed(1)}%. That difference saves you money every month on product that would have been thrown away.`,
          formula: '(12% baseline − your waste%) × avg daily product cost × 30 days',
        },
        {
          key: 'ghost',
          label: 'Ghost Product Recovery',
          amount: ghostSavings,
          explanation: 'Product that went missing without being logged to a service. Zura detected these discrepancies between expected and actual inventory depletion.',
          formula: 'Sum of unaccounted product cost detected over the last 30 days',
        },
        {
          key: 'supply',
          label: 'Supply Cost Recovery',
          amount: supplySavings,
          explanation: 'Overage charges collected from clients when they exceed their service allowance. This is revenue that would otherwise come out of your margin.',
          formula: 'Sum of approved overage charges in the last 30 days',
        },
      ];

      const totalSavings = Math.round((wasteSavings + ghostSavings + supplySavings) * 100) / 100;

      return {
        totalSavings,
        categories,
        avgCostPerService,
        actualWastePct: Math.round(avgWastePct * 10) / 10,
        snapshotCount: count,
        hasEnoughData: true,
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
  });
}
