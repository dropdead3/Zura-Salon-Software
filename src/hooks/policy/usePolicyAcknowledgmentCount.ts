/**
 * Wave 28.11.5 — Lightweight ack count for tab visibility.
 *
 * The configurator hides the Acknowledgments tab for `internal`-only policies
 * (silence-doctrine: dead UI removed). But if a policy was previously `both`
 * or `external` and has historical client acks, those rows must remain
 * visible to honor audit immutability.
 *
 * This hook returns a `count` only — not the full list — so it is safe to
 * call on every configurator open.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePolicyAcknowledgmentCount(policyId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-acknowledgment-count', policyId],
    enabled: !!policyId,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      if (!policyId) return 0;
      const { count, error } = await supabase
        .from('policy_acknowledgments')
        .select('id', { count: 'exact', head: true })
        .eq('policy_id', policyId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
