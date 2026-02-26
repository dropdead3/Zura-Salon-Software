import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Reads and writes the `checkout_alerts_super_admins_enabled` flag
 * stored in `organizations.settings` JSONB.
 */
export function useCheckoutAlertSettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['checkout-alert-settings', orgId],
    queryFn: async () => {
      if (!orgId) return { superAdminsEnabled: true };
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      const settings = (data?.settings as Record<string, unknown>) ?? {};
      return {
        superAdminsEnabled: settings.checkout_alerts_super_admins_enabled !== false, // default true
      };
    },
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: async (superAdminsEnabled: boolean) => {
      if (!orgId) throw new Error('No organization');

      // Read current settings to merge
      const { data: current } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();

      const existingSettings = (current?.settings as Record<string, unknown>) ?? {};

      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...existingSettings,
            checkout_alerts_super_admins_enabled: superAdminsEnabled,
          },
        })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-alert-settings', orgId] });
    },
  });

  return {
    superAdminsEnabled: query.data?.superAdminsEnabled ?? true,
    isLoading: query.isLoading,
    setSuperAdminsEnabled: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
