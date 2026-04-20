/**
 * Policy Conflict Resolution hook (Wave 28.9)
 *
 * Disables a single (version_id, surface) mapping so two policies of the same
 * category no longer fight for the same surface. Soft-disable only — no row
 * deletion — so version history remains intact for audit.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import type { PolicySurface } from './usePolicyData';

export function useResolvePolicyConflict() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({
      versionId,
      surface,
    }: {
      versionId: string;
      surface: PolicySurface;
    }) => {
      // Wave 28.11.5 — only proceed (and audit-log) when there's an actually
      // enabled mapping to disable. Without this guard, repeated clicks or
      // stale UI state would write false "surface_mapping_disabled" rows.
      const { data: existing, error: selErr } = await supabase
        .from('policy_surface_mappings')
        .select('enabled')
        .eq('version_id', versionId)
        .eq('surface', surface)
        .eq('enabled', true)
        .maybeSingle();
      if (selErr) throw selErr;
      if (!existing) {
        // Idempotent no-op: nothing enabled to disable.
        return { versionId, surface, noop: true as const };
      }

      const { error } = await supabase
        .from('policy_surface_mappings')
        .update({ enabled: false })
        .eq('version_id', versionId)
        .eq('surface', surface)
        .eq('enabled', true);
      if (error) throw error;

      // Wave 28.10.1 — audit trail for conflict resolutions.
      if (orgId) {
        const { data: userData } = await supabase.auth.getUser();
        const actorId = userData?.user?.id;
        // Resolve policy_id from the version for richer audit context.
        const { data: versionRow } = await supabase
          .from('policy_versions')
          .select('policy_id')
          .eq('id', versionId)
          .maybeSingle();
        if (actorId) {
          await supabase.from('policy_change_log').insert({
            organization_id: orgId,
            policy_id: versionRow?.policy_id ?? null,
            version_id: versionId,
            actor_user_id: actorId,
            event_type: 'surface_mapping_disabled',
            previous_value: { enabled: true, surface },
            new_value: { enabled: false, surface },
            metadata: { reason: 'conflict_resolution' },
          });
        }
      }

      return { versionId, surface, noop: false as const };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['org-policy-surface-mappings', orgId] });
      qc.invalidateQueries({ queryKey: ['policy-surfaces', res.versionId] });
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      if (res.noop) {
        toast({
          title: 'Already disabled',
          description: 'No active mapping was found for that surface.',
        });
        return;
      }
      toast({
        title: 'Mapping disabled',
        description: 'This policy no longer renders on that surface.',
      });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not disable mapping',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}
