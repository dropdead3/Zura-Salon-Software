import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export function useCapitalPolicySettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['capital-policy-settings', orgId],
    queryFn: async () => {
      // Try org-specific first, then fall back to platform defaults
      const { data: orgSettings } = await supabase
        .from('capital_policy_settings')
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();

      if (orgSettings) return orgSettings;

      // Fallback: platform defaults (org_id IS NULL)
      const { data: defaults } = await supabase
        .from('capital_policy_settings')
        .select('*')
        .is('organization_id', null)
        .maybeSingle();

      return defaults;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCapitalPolicySettings() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!orgId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('capital_policy_settings')
        .upsert(
          {
            organization_id: orgId,
            ...updates,
          } as any,
          { onConflict: 'organization_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-policy-settings', orgId] });
      toast.success('Capital policy settings updated');
    },
    onError: (err) => toast.error('Failed: ' + (err as Error).message),
  });
}
