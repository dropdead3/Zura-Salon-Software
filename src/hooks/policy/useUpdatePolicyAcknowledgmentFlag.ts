/**
 * Wave 28.10 — Toggle `requires_acknowledgment` flag on a policy.
 *
 * Operator-only mutation. Flips the per-policy opt-in switch that surfaces
 * the acknowledgment footer on the public Policy Center.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Input {
  policyId: string;
  requiresAcknowledgment: boolean;
}

export function useUpdatePolicyAcknowledgmentFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ policyId, requiresAcknowledgment }: Input) => {
      // RLS-gated to is_org_admin(auth.uid(), organization_id) per Wave 28.10.1 audit.
      const { error } = await supabase
        .from('policies')
        .update({ requires_acknowledgment: requiresAcknowledgment })
        .eq('id', policyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-data'] });
      qc.invalidateQueries({ queryKey: ['policy-configurator'] });
      qc.invalidateQueries({ queryKey: ['public-org-policies'] });
    },
  });
}
