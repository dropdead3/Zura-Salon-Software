/**
 * usePolicyLastEdited (Wave 28.17.1)
 *
 * Returns the most recent edit signal for a policy: the latest of either the
 * current `policy_versions.updated_at` or the latest `policy_rule_blocks.updated_at`
 * for that version, plus a resolved actor display name.
 *
 * Read-only. Used by the POS Cancellations & Fees tab to surface a "Last edited
 * X ago by Name" footer so operators can trust (or question) what they're
 * looking at without leaving the surface.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

export interface PolicyLastEdited {
  updatedAt: string | null;
  actorName: string;
}

const FALLBACK_ACTOR = 'a team member';

export function usePolicyLastEdited(policyId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-last-edited', policyId],
    queryFn: async (): Promise<PolicyLastEdited> => {
      if (!policyId) return { updatedAt: null, actorName: FALLBACK_ACTOR };

      // Most recent version row
      const { data: version, error: vErr } = await supabase
        .from('policy_versions')
        .select('id, updated_at, approved_by, created_by, approved_at')
        .eq('policy_id', policyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!version) return { updatedAt: null, actorName: FALLBACK_ACTOR };

      // Latest block update for that version
      const { data: latestBlock } = await supabase
        .from('policy_rule_blocks')
        .select('updated_at')
        .eq('version_id', version.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const versionTime = version.updated_at ? new Date(version.updated_at).getTime() : 0;
      const blockTime = latestBlock?.updated_at ? new Date(latestBlock.updated_at).getTime() : 0;
      const updatedAt =
        blockTime > versionTime
          ? latestBlock!.updated_at
          : version.updated_at;

      // Prefer approver if present, otherwise creator
      const actorId = version.approved_by ?? version.created_by;
      let actorName = FALLBACK_ACTOR;
      if (actorId) {
        const { data: profile } = await supabase
          .from('employee_profiles')
          .select('display_name, full_name')
          .eq('user_id', actorId)
          .maybeSingle();
        if (profile) {
          actorName = formatDisplayName(profile.full_name || '', profile.display_name || undefined);
        }
      }

      return { updatedAt, actorName };
    },
    enabled: !!policyId,
    staleTime: 30_000, // refresh within ~30s of an edit on the editor surface
  });
}
