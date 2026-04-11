import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSEOCampaigns(organizationId: string | undefined, filters?: {
  status?: string[];
  locationId?: string;
}) {
  return useQuery({
    queryKey: ['seo-campaigns', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('seo_campaigns' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
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
