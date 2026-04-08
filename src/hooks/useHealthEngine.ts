import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationIntegrations } from './useOrganizationIntegrations';

// ─── Types ───────────────────────────────────────────────────────────
export interface HealthMetric {
  name: string;
  value: number;
  benchmark: number;
  score: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface HealthCategory {
  score: number;
  available: boolean;
  metrics: HealthMetric[];
  topDrag: string;
  topStrength: string;
  leverRecommendation: string;
}

export interface HealthBreakdown {
  revenue?: HealthCategory;
  client?: HealthCategory;
  retention?: HealthCategory;
  utilization?: HealthCategory;
  team_performance?: HealthCategory;
  operational_consistency?: HealthCategory;
  inventory_cost?: HealthCategory;
  profitability?: HealthCategory;
}

export interface DataProfile {
  hasPOS: boolean;
  hasPayroll: boolean;
  hasInventory: boolean;
  hasAccounting: boolean;
}

export type RiskTier = 'elite' | 'strong' | 'at_risk' | 'critical';

export function getRiskTier(score: number): RiskTier {
  if (score >= 85) return 'elite';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'at_risk';
  return 'critical';
}

export function getRiskLabel(tier: RiskTier): string {
  const labels: Record<RiskTier, string> = {
    elite: 'Elite',
    strong: 'Strong',
    at_risk: 'At Risk',
    critical: 'Critical',
  };
  return labels[tier];
}

export const RISK_TIER_COLORS: Record<RiskTier, string> = {
  elite: 'text-emerald-500',
  strong: 'text-blue-500',
  at_risk: 'text-amber-500',
  critical: 'text-destructive',
};

export const RISK_TIER_BG: Record<RiskTier, string> = {
  elite: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  strong: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  at_risk: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-destructive/10 text-destructive',
};

export const CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Revenue Health',
  client: 'Client Health',
  retention: 'Retention Health',
  utilization: 'Utilization Health',
  team_performance: 'Team Performance',
  operational_consistency: 'Operational Consistency',
  inventory_cost: 'Inventory / Cost Control',
  profitability: 'Profitability',
};

export const CATEGORY_ORDER = [
  'revenue', 'client', 'retention', 'utilization',
  'team_performance', 'operational_consistency', 'inventory_cost', 'profitability',
];

// ─── Hooks ───────────────────────────────────────────────────────────

export interface OrgHealthScore {
  id: string;
  organization_id: string;
  score: number;
  risk_level: string;
  score_breakdown: HealthBreakdown;
  trends: {
    score_7d_ago: number | null;
    score_30d_ago: number | null;
    trend: 'improving' | 'stable' | 'declining';
  };
  recommendations: string[];
  data_profile: DataProfile;
  score_date: string;
  calculated_at: string;
}

export function useOrgHealthScore(orgId: string | undefined) {
  return useQuery({
    queryKey: ['health-engine-org', orgId],
    queryFn: async (): Promise<OrgHealthScore | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organization_health_scores')
        .select('*')
        .eq('organization_id', orgId)
        .order('score_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        score_breakdown: (data.score_breakdown as unknown as HealthBreakdown) || {},
        trends: (data.trends as any) || { score_7d_ago: null, score_30d_ago: null, trend: 'stable' },
        recommendations: (data.recommendations as string[]) || [],
        data_profile: ((data as any).data_profile as DataProfile) || { hasPOS: false, hasPayroll: false, hasInventory: false, hasAccounting: false },
        risk_level: data.risk_level || 'critical',
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export interface LocationHealthScore {
  id: string;
  location_id: string;
  organization_id: string;
  score: number;
  risk_level: string;
  score_breakdown: HealthBreakdown;
  data_profile: DataProfile;
  score_date: string;
}

export function useLocationHealthScores(orgId: string | undefined) {
  return useQuery({
    queryKey: ['health-engine-locations', orgId],
    queryFn: async (): Promise<LocationHealthScore[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('location_health_scores')
        .select('*')
        .eq('organization_id', orgId)
        .order('score_date', { ascending: false });

      if (error) throw error;

      // Latest per location
      const byLoc = new Map<string, LocationHealthScore>();
      for (const row of data || []) {
        if (!byLoc.has(row.location_id)) {
          byLoc.set(row.location_id, {
            ...row,
            score_breakdown: (row.score_breakdown as unknown as HealthBreakdown) || {},
            data_profile: ((row as any).data_profile as DataProfile) || { hasPOS: false, hasPayroll: false, hasInventory: false, hasAccounting: false },
          });
        }
      }
      return Array.from(byLoc.values());
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHealthHistory(entityId: string | undefined, entityType: 'org' | 'location' = 'org', days = 30) {
  return useQuery({
    queryKey: ['health-engine-history', entityType, entityId, days],
    queryFn: async () => {
      if (!entityId) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const table = entityType === 'org' ? 'organization_health_scores' : 'location_health_scores';
      const idCol = entityType === 'org' ? 'organization_id' : 'location_id';

      const { data, error } = await supabase
        .from(table)
        .select('score_date, score')
        .eq(idCol, entityId)
        .gte('score_date', startDate.toISOString().split('T')[0])
        .order('score_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });
}

export function useDataProfile(orgId: string | undefined) {
  const { data: integrations } = useOrganizationIntegrations(orgId);

  return {
    hasPOS: integrations?.phorest.connected ?? false,
    hasPayroll: integrations?.payroll.connected ?? false,
    hasInventory: false, // Derived from backroom data in edge function
    hasAccounting: false,
  };
}

export function useRecalculateHealth() {
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
      queryClient.invalidateQueries({ queryKey: ['health-engine-org'] });
      queryClient.invalidateQueries({ queryKey: ['health-engine-locations'] });
      queryClient.invalidateQueries({ queryKey: ['health-engine-history'] });
    },
  });
}
