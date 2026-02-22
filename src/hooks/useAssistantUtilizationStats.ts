import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { subDays, format } from 'date-fns';

export interface TopAssistant {
  user_id: string;
  name: string;
  photo_url: string | null;
  confirmed_hours: number;
  total_assigned: number;
}

export interface AssistantUtilizationData {
  totalRequests: number;
  acceptedRequests: number;
  acceptanceRate: number;
  totalCoverageMinutes: number;
  avgResponseMinutes: number | null;
  topAssistants: TopAssistant[];
  isLoading: boolean;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Aggregated utilization metrics for the assistant time block system.
 * Computes acceptance rates, coverage hours, and response times.
 */
export function useAssistantUtilizationStats(
  organizationId: string | null,
  days: number = 30,
): AssistantUtilizationData {
  const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['assistant-utilization-blocks', organizationId, dateFrom],
    queryFn: async () => {
      let query = supabase
        .from('assistant_time_blocks')
        .select('*')
        .gte('date', dateFrom);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const { data: profiles } = useQuery({
    queryKey: ['assistant-utilization-profiles', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url');
      if (error) throw error;
      return new Map((data || []).map(p => [p.user_id, p]));
    },
    enabled: !!organizationId,
    staleTime: 120_000,
  });

  const stats = useMemo(() => {
    if (!blocks) {
      return {
        totalRequests: 0,
        acceptedRequests: 0,
        acceptanceRate: 0,
        totalCoverageMinutes: 0,
        avgResponseMinutes: null,
        topAssistants: [],
      };
    }

    const totalRequests = blocks.length;
    const confirmed = blocks.filter(b => b.status === 'confirmed');
    const acceptedRequests = confirmed.length;
    const acceptanceRate = totalRequests > 0 ? acceptedRequests / totalRequests : 0;

    // Total coverage minutes for confirmed blocks
    const totalCoverageMinutes = confirmed.reduce((sum, b) => {
      const start = parseTimeToMinutes(b.start_time);
      const end = parseTimeToMinutes(b.end_time);
      return sum + Math.max(0, end - start);
    }, 0);

    // Average response time (updated_at - created_at for confirmed blocks)
    const responseTimes = confirmed
      .map(b => {
        const created = new Date(b.created_at).getTime();
        const updated = new Date(b.updated_at).getTime();
        const diffMinutes = (updated - created) / 60000;
        return diffMinutes > 0 ? diffMinutes : null;
      })
      .filter((t): t is number => t !== null);

    const avgResponseMinutes = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Top assistants by confirmed hours
    const assistantMap = new Map<string, { confirmed_minutes: number; total: number }>();
    for (const b of blocks) {
      if (!b.assistant_user_id) continue;
      const existing = assistantMap.get(b.assistant_user_id) || { confirmed_minutes: 0, total: 0 };
      existing.total++;
      if (b.status === 'confirmed') {
        const start = parseTimeToMinutes(b.start_time);
        const end = parseTimeToMinutes(b.end_time);
        existing.confirmed_minutes += Math.max(0, end - start);
      }
      assistantMap.set(b.assistant_user_id, existing);
    }

    const topAssistants: TopAssistant[] = Array.from(assistantMap.entries())
      .map(([userId, data]) => {
        const profile = profiles?.get(userId);
        return {
          user_id: userId,
          name: profile?.display_name || profile?.full_name || 'Unknown',
          photo_url: profile?.photo_url || null,
          confirmed_hours: Math.round((data.confirmed_minutes / 60) * 10) / 10,
          total_assigned: data.total,
        };
      })
      .sort((a, b) => b.confirmed_hours - a.confirmed_hours)
      .slice(0, 5);

    return {
      totalRequests,
      acceptedRequests,
      acceptanceRate,
      totalCoverageMinutes,
      avgResponseMinutes,
      topAssistants,
    };
  }, [blocks, profiles]);

  return { ...stats, isLoading: blocksLoading };
}
