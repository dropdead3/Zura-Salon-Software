/**
 * Wave 28.11.5 — Archive a policy (lifecycle hardening).
 *
 * Soft-archives a policy by flipping `policies.status` to `archived`. The
 * underlying versions, variants, and acknowledgment rows remain intact —
 * audit immutability is preserved. Operators can revisit the configurator
 * at any time to "Reactivate" by adopting again (status returns to drafting).
 *
 * Side effects:
 *   - Disables every active surface mapping under the policy's current version
 *     so client-facing surfaces stop rendering immediately.
 *   - Logs a row to `policy_change_log` for audit.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface Input {
  policyId: string;
  currentVersionId?: string | null;
  /** New status to apply. Defaults to 'archived'; pass 'drafting' to reactivate. */
  nextStatus?: 'archived' | 'drafting';
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ policyId, currentVersionId, nextStatus = 'archived' }: Input) => {
      // 1) Capture previous state for audit log.
      const { data: before } = await supabase
        .from('policies')
        .select('status')
        .eq('id', policyId)
        .maybeSingle();

      // 2) Flip status.
      const { error: pErr } = await supabase
        .from('policies')
        .update({ status: nextStatus })
        .eq('id', policyId);
      if (pErr) throw pErr;

      // 3) On archive, disable surface mappings so renders stop immediately.
      //    On reactivate, leave mappings as-is (operator re-enables manually).
      if (nextStatus === 'archived' && currentVersionId) {
        await supabase
          .from('policy_surface_mappings')
          .update({ enabled: false })
          .eq('version_id', currentVersionId)
          .eq('enabled', true);
      }

      // 4) Audit row.
      if (orgId) {
        const { data: userData } = await supabase.auth.getUser();
        const actorId = userData?.user?.id;
        if (actorId) {
          await supabase.from('policy_change_log').insert({
            organization_id: orgId,
            policy_id: policyId,
            version_id: currentVersionId ?? null,
            actor_user_id: actorId,
            event_type: nextStatus === 'archived' ? 'policy_archived' : 'policy_reactivated',
            previous_value: { status: before?.status ?? null },
            new_value: { status: nextStatus },
            metadata: {
              disabled_surface_mappings: nextStatus === 'archived' && !!currentVersionId,
            },
          });
        }
      }

      return { policyId, status: nextStatus };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      qc.invalidateQueries({ queryKey: ['policy-configurator', orgId] });
      qc.invalidateQueries({ queryKey: ['org-policy-surface-mappings', orgId] });
      qc.invalidateQueries({ queryKey: ['public-org-policies'] });
      toast({
        title: res.status === 'archived' ? 'Policy archived' : 'Policy reactivated',
        description:
          res.status === 'archived'
            ? 'Stopped rendering on client surfaces. History preserved.'
            : 'Status returned to drafting. Re-enable surfaces when ready.',
      });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not update policy',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}
