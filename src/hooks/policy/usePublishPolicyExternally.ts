/**
 * Wave 28.11.1 — Publish a policy externally to the client Policy Center.
 *
 * Wraps the `publish_policy_externally(p_policy_id, p_publish)` RPC. The RPC:
 *   - validates that the caller is an org admin
 *   - requires an approved `client` variant before publishing audience=external/both
 *   - flips `policy_versions.is_published_external` on the current version
 *   - auto-recomputes `policies.status` (→ published_external or wired)
 *   - writes an audit row to `policy_change_log`
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface Input {
  policyId: string;
  publish: boolean;
}

export function usePublishPolicyExternally() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ policyId, publish }: Input) => {
      const { data, error } = await supabase.rpc('publish_policy_externally', {
        p_policy_id: policyId,
        p_publish: publish,
      });
      if (error) throw error;
      return data as {
        changed: boolean;
        is_published_external: boolean;
        policy_id: string;
        version_id: string;
      };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['policy-configurator', orgId] });
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      qc.invalidateQueries({ queryKey: ['public-org-policies', orgId] });
      qc.invalidateQueries({ queryKey: ['policy-variants', res.version_id] });
      toast({
        title: vars.publish ? 'Published to client policy center' : 'Unpublished from client policy center',
        description: vars.publish
          ? 'Clients can now see this policy on your public policy page.'
          : 'This policy is no longer visible on your public policy page.',
      });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not update publish state',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}
