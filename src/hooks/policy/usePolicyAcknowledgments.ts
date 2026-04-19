/**
 * Wave 28.10 — Policy Acknowledgment hooks
 *
 * Three hooks bundled here:
 *   - useRecordPolicyAcknowledgment — public mutation invoking the edge function
 *   - useClientAcknowledgments — given an email + orgId, returns the set of
 *       policy_ids the client has already acknowledged (for de-duplication UI)
 *   - usePolicyAcknowledgmentList — operator-side list of all acks for a policy
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecordAckInput {
  policy_id: string;
  client_email: string;
  client_name: string;
  signature_text?: string;
  acknowledgment_method?: 'typed_signature' | 'checkbox' | 'click';
  appointment_id?: string | null;
}

export interface RecordAckResult {
  acknowledgment_id: string;
  acknowledged_at: string;
}

export function useRecordPolicyAcknowledgment() {
  const qc = useQueryClient();
  return useMutation<RecordAckResult, Error, RecordAckInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke(
        'record-policy-acknowledgment',
        { body: input },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Failed to record acknowledgment');
      return {
        acknowledgment_id: data.acknowledgment_id,
        acknowledged_at: data.acknowledged_at,
      };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ['client-acknowledgments', vars.client_email.trim().toLowerCase()],
      });
      qc.invalidateQueries({ queryKey: ['policy-acknowledgments', vars.policy_id] });
    },
  });
}

/**
 * Given a client email + organization, returns the set of policy_ids that
 * client has already acknowledged. Read via RLS — only callable by org members.
 *
 * The public Policy Center reads from localStorage instead; this hook is
 * for operator visibility surfaces.
 */
export function useClientAcknowledgments(
  clientEmail: string | null | undefined,
  orgId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['client-acknowledgments', clientEmail?.trim().toLowerCase(), orgId],
    enabled: !!clientEmail && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!clientEmail || !orgId) return new Set<string>();
      const email = clientEmail.trim().toLowerCase();
      const { data, error } = await (supabase as any)
        .from('policy_acknowledgments')
        .select('policy_id')
        .eq('organization_id', orgId)
        .ilike('client_email', email);
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: any) => r.policy_id).filter(Boolean));
    },
  });
}

export interface PolicyAcknowledgmentRow {
  id: string;
  client_name: string;
  client_email: string;
  signature_text: string;
  acknowledgment_method: string;
  ip_address: string | null;
  acknowledged_at: string;
  policy_version_id: string;
}

/**
 * Operator-side: lists all acknowledgments for a given policy across versions,
 * newest first. Limited to the most recent 500 for the panel.
 */
export function usePolicyAcknowledgmentList(policyId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-acknowledgments', policyId],
    enabled: !!policyId,
    staleTime: 30_000,
    queryFn: async (): Promise<PolicyAcknowledgmentRow[]> => {
      if (!policyId) return [];
      const { data, error } = await (supabase as any)
        .from('policy_acknowledgments')
        .select(
          'id, client_name, client_email, signature_text, acknowledgment_method, ip_address, acknowledged_at, policy_version_id',
        )
        .eq('policy_id', policyId)
        .order('acknowledged_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).filter((r: any) => !!r.client_email && !!r.client_name);
    },
  });
}
