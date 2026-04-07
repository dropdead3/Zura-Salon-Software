import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HealthBreakdown {
  adoption: {
    score: number;
    factors: {
      active_users: number;
      total_users: number;
      login_frequency: number;
      features_used: number;
    };
  };
  engagement: {
    score: number;
    factors: {
      chat_messages_7d: number;
      announcements_count: number;
      tasks_completed: number;
    };
  };
  performance: {
    score: number;
    factors: {
      revenue_current: number;
      revenue_previous: number;
      revenue_trend: number;
      booking_count: number;
      avg_ticket: number;
    };
  };
  data_quality: {
    score: number;
    factors: {
      sync_success_rate: number;
      hours_since_sync: number;
      anomalies_unresolved: number;
    };
  };
}

export interface HealthTrends {
  score_7d_ago: number | null;
  score_30d_ago: number | null;
  trend: 'improving' | 'stable' | 'declining';
}

export interface OrganizationHealthScore {
  id: string;
  organization_id: string;
  score: number;
  risk_level: 'healthy' | 'at_risk' | 'critical';
  score_breakdown: HealthBreakdown;
  trends: HealthTrends;
  recommendations: string[];
  score_date: string;
  calculated_at: string;
}

export interface HealthScoreWithOrg extends OrganizationHealthScore {
  organization?: {
    name: string;
    slug: string;
    status: string;
  };
}

export function useOrganizationHealthScores() {
  return useQuery({
    queryKey: ['organization-health-scores'],
    queryFn: async (): Promise<HealthScoreWithOrg[]> => {
      // Get the latest score for each organization
      const { data, error } = await supabase
        .from('organization_health_scores')
        .select(`
          *,
          organization:organizations(name, slug, status)
        `)
        .order('score_date', { ascending: false });

      if (error) throw error;

      // Filter to get only the latest score per org
      const latestByOrg = new Map<string, HealthScoreWithOrg>();
      for (const score of data || []) {
        if (!latestByOrg.has(score.organization_id)) {
          latestByOrg.set(score.organization_id, {
            ...score,
            score_breakdown: score.score_breakdown as unknown as HealthBreakdown,
            trends: score.trends as unknown as HealthTrends,
            recommendations: score.recommendations as string[],
            risk_level: score.risk_level as 'healthy' | 'at_risk' | 'critical',
          });
        }
      }

      return Array.from(latestByOrg.values());
    },
    refetchInterval: 300000, // Refresh every 5 minutes (platform admin)
  });
}

export function useOrganizationHealthScore(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-health-score', organizationId],
    queryFn: async (): Promise<OrganizationHealthScore | null> => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('organization_health_scores')
        .select('*')
        .eq('organization_id', organizationId)
        .order('score_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        score_breakdown: data.score_breakdown as unknown as HealthBreakdown,
        trends: data.trends as unknown as HealthTrends,
        recommendations: data.recommendations as string[],
        risk_level: data.risk_level as 'healthy' | 'at_risk' | 'critical',
      };
    },
    enabled: !!organizationId,
  });
}

export function useOrganizationHealthHistory(organizationId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ['organization-health-history', organizationId, days],
    queryFn: async (): Promise<Array<{ score_date: string; score: number }>> => {
      if (!organizationId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('organization_health_scores')
        .select('score_date, score')
        .eq('organization_id', organizationId)
        .gte('score_date', startDate.toISOString().split('T')[0])
        .order('score_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
}

export function useHealthStats() {
  const { data: scores } = useOrganizationHealthScores();

  const healthy = scores?.filter((s) => s.risk_level === 'healthy').length || 0;
  const atRisk = scores?.filter((s) => s.risk_level === 'at_risk').length || 0;
  const critical = scores?.filter((s) => s.risk_level === 'critical').length || 0;
  const total = scores?.length || 0;

  const avgScore = total > 0
    ? scores?.reduce((sum, s) => sum + Number(s.score), 0) / total
    : 0;

  return {
    healthy,
    atRisk,
    critical,
    total,
    avgScore: Math.round(avgScore * 10) / 10,
  };
}

export function useRecalculateHealthScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId?: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-health-scores', {
        body: organizationId ? { organizationId } : {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-health-scores'] });
      queryClient.invalidateQueries({ queryKey: ['organization-health-score'] });
      queryClient.invalidateQueries({ queryKey: ['organization-health-history'] });
    },
  });
}
