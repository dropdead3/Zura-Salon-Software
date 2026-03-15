import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

interface ROIData {
  monthlySavings: number;
  subscriptionCost: number;
  netBenefit: number;
  wasteReduction: number;
  hasEnoughData: boolean;
  snapshotCount: number;
}

/** Industry baseline: ~12% waste rate on color spend */
const BASELINE_WASTE_RATE = 0.12;

export function useBackroomROI(subscriptionMonthlyCost?: number) {
  const orgId = useBackroomOrgId();

  return useQuery<ROIData>({
    queryKey: ['backroom-roi', orgId, subscriptionMonthlyCost],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      // Fetch last 30 days of snapshots
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: snapshots, error } = await supabase
        .from('backroom_analytics_snapshots')
        .select('waste_pct, total_waste_qty, total_product_cost, avg_chemical_cost_per_service, ghost_loss_cost')
        .eq('organization_id', orgId)
        .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: false });

      if (error) throw error;

      const count = snapshots?.length ?? 0;
      if (count < 7) {
        return {
          monthlySavings: 0,
          subscriptionCost: subscriptionMonthlyCost ?? 0,
          netBenefit: 0,
          wasteReduction: 0,
          hasEnoughData: false,
          snapshotCount: count,
        };
      }

      // Average metrics across snapshots
      const avgWastePct = snapshots!.reduce((s, r) => s + (r.waste_pct ?? 0), 0) / count;
      const avgProductCost = snapshots!.reduce((s, r) => s + (r.total_product_cost ?? 0), 0) / count;
      const totalGhostLoss = snapshots!.reduce((s, r) => s + (r.ghost_loss_cost ?? 0), 0);

      // Savings = (baseline waste - actual waste) * avg product spend + ghost loss recovered
      const wasteReduction = Math.max(0, BASELINE_WASTE_RATE - (avgWastePct / 100));
      const wasteSavings = wasteReduction * avgProductCost * 30; // monthly estimate
      const ghostSavings = totalGhostLoss; // already cumulative for the period

      const monthlySavings = Math.round((wasteSavings + ghostSavings) * 100) / 100;
      const subCost = subscriptionMonthlyCost ?? 0;

      return {
        monthlySavings,
        subscriptionCost: subCost,
        netBenefit: Math.round((monthlySavings - subCost) * 100) / 100,
        wasteReduction: Math.round(wasteReduction * 1000) / 10,
        hasEnoughData: true,
        snapshotCount: count,
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
  });
}
