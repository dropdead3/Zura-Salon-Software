import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PromotionRecord {
  id: string;
  user_id: string;
  from_level: string;
  to_level: string;
  promoted_by: string;
  promoted_at: string;
  created_at: string;
  promoter_name?: string;
}

export function usePromotionHistory(userId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['promotion-history', orgId, userId],
    queryFn: async () => {
      let query = supabase
        .from('level_promotions')
        .select('*')
        .eq('organization_id', orgId!)
        .order('promoted_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch promoter names
      const promoterIds = [...new Set((data || []).map(d => d.promoted_by))];
      let promoterMap: Record<string, string> = {};

      if (promoterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name')
          .in('user_id', promoterIds);

        if (profiles) {
          promoterMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      return (data || []).map(d => ({
        ...d,
        promoter_name: promoterMap[d.promoted_by] || 'Unknown',
      })) as PromotionRecord[];
    },
    enabled: !!orgId,
  });
}

export function useOrgPromotionHistory() {
  return usePromotionHistory(undefined);
}
