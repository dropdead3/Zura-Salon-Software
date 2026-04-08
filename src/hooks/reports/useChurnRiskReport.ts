import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ChurnRiskEntry {
  id: string;
  riskLevel: string;
  riskScore: number;
  factors: string[];
  recommendations: string[];
  analyzedAt: string;
}

export interface ChurnRiskSummary {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export function useChurnRiskReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['churn-risk-report', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('churn_risk_scores')
        .select('id, risk_level, risk_score, factors, recommendations, analyzed_at')
        .eq('organization_id', orgId!)
        .order('risk_score', { ascending: false });
      if (error) throw error;

      const entries: ChurnRiskEntry[] = (data || []).map(r => ({
        id: r.id,
        riskLevel: r.risk_level || 'unknown',
        riskScore: Number(r.risk_score) || 0,
        factors: Array.isArray(r.factors) ? (r.factors as string[]) : [],
        recommendations: Array.isArray(r.recommendations) ? (r.recommendations as string[]) : [],
        analyzedAt: r.analyzed_at?.split('T')[0] || '',
      }));

      const summary: ChurnRiskSummary = {
        high: entries.filter(e => e.riskLevel === 'high').length,
        medium: entries.filter(e => e.riskLevel === 'medium').length,
        low: entries.filter(e => e.riskLevel === 'low').length,
        total: entries.length,
      };

      return { entries, summary };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
