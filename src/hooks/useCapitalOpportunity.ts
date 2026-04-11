import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useCapitalOpportunity(opportunityId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const opportunityQuery = useQuery({
    queryKey: ['capital-opportunity', orgId, opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_funding_opportunities')
        .select('*')
        .eq('id', opportunityId!)
        .eq('organization_id', orgId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!opportunityId,
  });

  const eventsQuery = useQuery({
    queryKey: ['capital-opportunity-events', orgId, opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_event_log')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('funding_opportunity_id', opportunityId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!opportunityId,
  });

  return {
    opportunity: opportunityQuery.data,
    events: eventsQuery.data ?? [],
    isLoading: opportunityQuery.isLoading,
    isEventsLoading: eventsQuery.isLoading,
  };
}
