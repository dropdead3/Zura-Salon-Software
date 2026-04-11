import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export function useFinancedProjects() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['financed-projects', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financed_projects')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useFinancedProjectLedger(projectId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['financed-project-ledger', orgId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financed_project_ledger')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('financed_project_id', projectId!)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      financed_project_id: string;
      entry_type: 'repayment' | 'revenue_lift_recorded' | 'adjustment';
      amount: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('financed_project_ledger')
        .insert({
          organization_id: orgId!,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['financed-project-ledger', orgId, vars.financed_project_id] });
      queryClient.invalidateQueries({ queryKey: ['financed-projects', orgId] });
      toast.success('Ledger entry recorded');
    },
    onError: (err) => toast.error('Failed: ' + (err as Error).message),
  });
}

export function useInitiateFinancing() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: { opportunityId: string }) => {
      const { data, error } = await supabase.functions.invoke('create-financing-checkout', {
        body: { opportunityId: input.opportunityId, organizationId: orgId },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onError: (err) => toast.error('Financing failed: ' + (err as Error).message),
  });
}
