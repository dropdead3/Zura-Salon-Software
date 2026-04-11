import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useCapitalProjects(statusFilter?: string[]) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['capital-funding-projects', orgId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('capital_funding_projects')
        .select('*, capital_funding_opportunities(title, opportunity_type, constraint_type, location_id, service_id)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCapitalProject(projectId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['capital-funding-project', orgId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_funding_projects')
        .select('*, capital_funding_opportunities(title, opportunity_type, constraint_type, summary, location_id, service_id)')
        .eq('id', projectId!)
        .eq('organization_id', orgId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!projectId,
  });
}
