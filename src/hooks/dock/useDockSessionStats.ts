/**
 * useDockSessionStats — Fetches aggregated session stats from mix_bowl_projections.
 * Accepts a single sessionId OR an array of sessionIds for multi-session aggregation.
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

const DEMO_SESSION_STATS: SessionStats = {
  totalBowls: 2,
  reweighedBowls: 1,
  totalDispensed: 65,
  totalLeftover: 8,
  totalNetUsage: 57,
  totalCost: 12.50,
};

export function useDockSessionStats(sessionIdOrIds: string | string[] | null) {
  // Normalize to array
  const sessionIds = Array.isArray(sessionIdOrIds)
    ? sessionIdOrIds.filter(Boolean)
    : sessionIdOrIds ? [sessionIdOrIds] : [];

  return useQuery({
    queryKey: ['dock-session-stats', ...sessionIds],
    queryFn: async (): Promise<SessionStats> => {
      if (sessionIds.some(id => id.startsWith('demo-'))) return DEMO_SESSION_STATS;

      const { data, error } = await supabase
        .from('mix_bowl_projections')
        .select('dispensed_total, leftover_total, net_usage_total, estimated_cost, has_reweigh, current_status')
        .in('mix_session_id', sessionIds);

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
    enabled: sessionIds.length > 0,
    staleTime: 10_000,
  });
}
