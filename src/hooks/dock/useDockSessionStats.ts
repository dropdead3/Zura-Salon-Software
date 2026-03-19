/**
 * useDockSessionStats — Fetches aggregated session stats from mix_bowl_projections.
 * Provides real dispensed/leftover/cost totals for the session complete sheet.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionStats {
  totalBowls: number;
  reweighedBowls: number;
  totalDispensed: number;
  totalLeftover: number;
  totalNetUsage: number;
  totalCost: number;
}

export function useDockSessionStats(sessionId: string | null) {
  return useQuery({
    queryKey: ['dock-session-stats', sessionId],
    queryFn: async (): Promise<SessionStats> => {
      const { data, error } = await supabase
        .from('mix_bowl_projections')
        .select('dispensed_total, leftover_total, net_usage_total, estimated_cost, has_reweigh, current_status')
        .eq('mix_session_id', sessionId!);

      if (error) throw error;

      const bowls = data || [];
      return {
        totalBowls: bowls.length,
        reweighedBowls: bowls.filter((b: any) => b.has_reweigh === true).length,
        totalDispensed: bowls.reduce((sum: number, b: any) => sum + (b.dispensed_total || 0), 0),
        totalLeftover: bowls.reduce((sum: number, b: any) => sum + (b.leftover_total || 0), 0),
        totalNetUsage: bowls.reduce((sum: number, b: any) => sum + (b.net_usage_total || 0), 0),
        totalCost: bowls.reduce((sum: number, b: any) => sum + (b.estimated_cost || 0), 0),
      };
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}