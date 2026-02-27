import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useOrgSecuritySettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-security-settings', orgId],
    queryFn: async () => {
      if (!orgId) return { require_email_verification: false, restrict_signups: false };
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      const settings = (data?.settings as Record<string, unknown>) ?? {};
      return {
        require_email_verification: settings.require_email_verification === true,
        restrict_signups: settings.restrict_signups === true,
      };
    },
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: async (update: { require_email_verification?: boolean; restrict_signups?: boolean }) => {
      if (!orgId) throw new Error('No organization');
      const { data: current } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      const existing = (current?.settings as Record<string, unknown>) ?? {};
      const { error } = await supabase
        .from('organizations')
        .update({ settings: { ...existing, ...update } })
        .eq('id', orgId);
      if (error) throw error;
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: ['org-security-settings', orgId] });
      const previous = queryClient.getQueryData(['org-security-settings', orgId]);
      queryClient.setQueryData(['org-security-settings', orgId], (old: any) => ({ ...old, ...update }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['org-security-settings', orgId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['org-security-settings', orgId] });
    },
  });

  return {
    requireEmailVerification: data?.require_email_verification ?? false,
    restrictSignups: data?.restrict_signups ?? false,
    isLoading,
    updateSecurity: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
