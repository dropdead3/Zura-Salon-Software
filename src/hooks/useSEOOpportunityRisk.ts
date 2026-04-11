import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSEOOpportunityRisk(organizationId: string | undefined, filters?: {
  locationId?: string;
}) {
  return useQuery({
    queryKey: ['seo-opportunity-risk', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('seo_opportunity_risk_scores' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('opportunity_score', { ascending: false });

      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}
