/**
 * useReputationOrgToggle — Platform-staff hook for flipping `reputation_enabled`
 * on a single organization independently of Stripe billing. Mirrors
 * `useColorBarToggle` but simpler: there are no per-location entitlements.
 *
 * Use cases:
 *   - Comp an organization (free access)
 *   - Suspend a misbehaving organization
 *   - Override during Stripe sync gaps
 *
 * Writes a `reputation_admin_actions` audit row on every flip.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';

export function useReputationOrgToggle() {
  const qc = useQueryClient();
  const updateFlag = useUpdateOrgFeatureFlag();

  return useMutation({
    mutationFn: async (args: {
      organizationId: string;
      organizationName: string;
      enabled: boolean;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      await updateFlag.mutateAsync({
        organizationId: args.organizationId,
        flagKey: 'reputation_enabled',
        isEnabled: args.enabled,
        reason: args.reason,
      });

      await supabase.from('reputation_admin_actions' as any).insert({
        actor_user_id: user?.id ?? null,
        target_organization_id: args.organizationId,
        action_type: args.enabled ? 'org.reputation_enabled' : 'org.reputation_disabled',
        reason: args.reason,
        metadata: { organization_name: args.organizationName },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['platform-reputation-entitlements'] });
      qc.invalidateQueries({ queryKey: ['platform-reputation-admin-actions'] });
      toast.success(
        `Reputation ${vars.enabled ? 'enabled' : 'disabled'} for ${vars.organizationName}`,
      );
    },
    onError: (err: any) => {
      toast.error('Could not toggle Reputation: ' + (err?.message ?? 'unknown'));
    },
  });
}
