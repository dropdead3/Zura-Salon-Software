/**
 * useChemicalCostTrend — Queries backroom_analytics_snapshots for cost trend data.
 * Returns time series for sparklines and detects cost spikes.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { subDays, format } from 'date-fns';

export interface CostTrendPoint {
  date: string;
  avgCostPerService: number;
}

export interface CostTrendResult {
  points: CostTrendPoint[];
  currentAvg: number;
  rollingAvg: number;
  spikeRatio: number;
  hasCostSpike: boolean;
  trendDirection: 'up' | 'down' | 'stable';
}

export function useChemicalCostTrend(days: number = 28) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['chemical-cost-trend', orgId, days],
    queryFn: async (): Promise<CostTrendResult> => {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('backroom_analytics_snapshots')
        .select('snapshot_date, avg_chemical_cost_per_service')
        .eq('organization_id', orgId!)
        .gte('snapshot_date', startDate)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      const points: CostTrendPoint[] = (data ?? []).map((row: any) => ({
        date: row.snapshot_date,
        avgCostPerService: row.avg_chemical_cost_per_service ?? 0,
      }));

      const validPoints = points.filter((p) => p.avgCostPerService > 0);
      const rollingAvg = validPoints.length > 0
        ? validPoints.reduce((sum, p) => sum + p.avgCostPerService, 0) / validPoints.length
        : 0;

      const recentPoints = validPoints.slice(-3);
      const currentAvg = recentPoints.length > 0
        ? recentPoints.reduce((sum, p) => sum + p.avgCostPerService, 0) / recentPoints.length
        : 0;

      const spikeRatio = rollingAvg > 0 ? currentAvg / rollingAvg : 1;

      // Trend: compare first half vs second half
      const halfIdx = Math.floor(validPoints.length / 2);
      const firstHalf = validPoints.slice(0, halfIdx);
      const secondHalf = validPoints.slice(halfIdx);
      const firstAvg = firstHalf.length > 0
        ? firstHalf.reduce((s, p) => s + p.avgCostPerService, 0) / firstHalf.length
        : 0;
      const secondAvg = secondHalf.length > 0
        ? secondHalf.reduce((s, p) => s + p.avgCostPerService, 0) / secondHalf.length
        : 0;

      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (firstAvg > 0) {
        const changePct = ((secondAvg - firstAvg) / firstAvg) * 100;
        if (changePct > 10) trendDirection = 'up';
        else if (changePct < -10) trendDirection = 'down';
      }

      return {
        points,
        currentAvg: Math.round(currentAvg * 100) / 100,
        rollingAvg: Math.round(rollingAvg * 100) / 100,
        spikeRatio: Math.round(spikeRatio * 100) / 100,
        hasCostSpike: spikeRatio >= 1.5,
        trendDirection,
      };
    },
    enabled: !!orgId,
    staleTime: 300_000,
  });
}
