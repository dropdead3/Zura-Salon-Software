import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSEOHealthScores(organizationId: string | undefined, filters?: {
  seoObjectId?: string;
  domain?: string;
}) {
  return useQuery({
    queryKey: ['seo-health-scores', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('seo_health_scores' as any)
        .select('*, seo_objects(id, label, object_type)')
        .eq('organization_id', organizationId!)
        .order('scored_at', { ascending: false });

      if (filters?.seoObjectId) {
        query = query.eq('seo_object_id', filters.seoObjectId);
      }
      if (filters?.domain) {
        query = query.eq('domain', filters.domain);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}

/**
 * Get latest scores per domain for an organization (one per object per domain).
 */
export function useSEOHealthSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['seo-health-summary', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_health_scores' as any)
        .select('domain, score, seo_object_id')
        .eq('organization_id', organizationId!)
        .order('scored_at', { ascending: false });

      if (error) throw error;

      // Aggregate: average score per domain
      const byDomain: Record<string, number[]> = {};
      for (const row of (data || []) as any[]) {
        if (!byDomain[row.domain]) byDomain[row.domain] = [];
        byDomain[row.domain].push(row.score);
      }

      return Object.entries(byDomain).map(([domain, scores]) => ({
        domain,
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        objectCount: scores.length,
      }));
    },
    enabled: !!organizationId,
  });
}
