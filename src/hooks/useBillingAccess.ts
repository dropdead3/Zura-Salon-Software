import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

/**
 * Controls access to the Account & Billing settings page.
 * - Account Owner (is_primary_owner) always has access.
 * - Super Admin (is_super_admin) has access unless the owner has enabled billing_owner_only.
 * - All other roles are denied.
 */
export function useBillingAccess() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const isPrimaryOwner = !!profile?.is_primary_owner;
  const isSuperAdmin = !!profile?.is_super_admin;

  // Query the billing_owner_only flag from organization_feature_flags
  const { data: billingOwnerOnly, isLoading: flagLoading } = useQuery({
    queryKey: ['billing-owner-only-flag', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('is_enabled')
        .eq('organization_id', orgId!)
        .eq('flag_key', 'billing_owner_only')
        .maybeSingle();

      if (error) throw error;
      return data?.is_enabled ?? false;
    },
    enabled: !!orgId,
  });

  const isBillingOwnerOnly = billingOwnerOnly ?? false;

  const canViewBilling = useMemo(() => {
    if (profileLoading || flagLoading) return false;
    if (isPrimaryOwner) return true;
    if (isSuperAdmin && !isBillingOwnerOnly) return true;
    return false;
  }, [isPrimaryOwner, isSuperAdmin, isBillingOwnerOnly, profileLoading, flagLoading]);

  const isLoading = profileLoading || flagLoading;

  // Mutation to toggle the billing_owner_only flag
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .upsert({
          organization_id: orgId!,
          flag_key: 'billing_owner_only',
          is_enabled: enabled,
          override_reason: enabled
            ? 'Owner restricted billing access'
            : 'Owner restored Super Admin billing access',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,flag_key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['billing-owner-only-flag', orgId] });
      toast.success(
        enabled
          ? 'Billing access restricted to Account Owner only'
          : 'Super Admins can now access billing'
      );
    },
    onError: () => {
      toast.error('Failed to update billing access setting');
    },
  });

  const toggleBillingOwnerOnly = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  return {
    canViewBilling,
    isPrimaryOwner,
    isSuperAdmin,
    isBillingOwnerOnly,
    toggleBillingOwnerOnly,
    isToggling: toggleMutation.isPending,
    isLoading,
  };
}
