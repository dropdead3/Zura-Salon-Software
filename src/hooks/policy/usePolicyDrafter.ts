/**
 * Policy Drafter hooks (Wave 28.6)
 *
 * Calls the policy-draft-variants edge function and reads back generated
 * policy_variants rows + recent draft jobs for UI status.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type PolicyVariantType = Database['public']['Enums']['policy_variant_type'];

export interface PolicyVariantRow {
  id: string;
  version_id: string;
  variant_type: PolicyVariantType;
  body_md: string | null;
  ai_generated: boolean;
  ai_model: string | null;
  approved: boolean;
  approved_at: string | null;
  last_drafted_at: string | null;
}

export interface PolicyDraftJobRow {
  id: string;
  version_id: string;
  variant_type: PolicyVariantType;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  model: string;
  error: string | null;
  created_at: string;
}

export const VARIANT_TYPE_ORDER: PolicyVariantType[] = [
  'internal',
  'client',
  'disclosure',
  'manager_note',
];

export const VARIANT_LABELS: Record<PolicyVariantType, { label: string; description: string }> = {
  internal: {
    label: 'Internal',
    description: 'Full operational detail for staff and handbook.',
  },
  client: {
    label: 'Client-facing',
    description: 'Plain-language version for clients.',
  },
  disclosure: {
    label: 'Short disclosure',
    description: 'One-paragraph summary shown at booking / checkout.',
  },
  manager_note: {
    label: 'Manager note',
    description: 'Decision card for handling exceptions.',
  },
};

export function usePolicyVariants(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-variants', versionId],
    queryFn: async (): Promise<PolicyVariantRow[]> => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('policy_variants')
        .select(
          'id, version_id, variant_type, body_md, ai_generated, ai_model, approved, approved_at, last_drafted_at',
        )
        .eq('version_id', versionId);
      if (error) throw error;
      return (data ?? []) as PolicyVariantRow[];
    },
    enabled: !!versionId,
  });
}

export function usePolicyDraftJobs(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-draft-jobs', versionId],
    queryFn: async (): Promise<PolicyDraftJobRow[]> => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('policy_draft_jobs')
        .select('id, version_id, variant_type, status, model, error, created_at')
        .eq('version_id', versionId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PolicyDraftJobRow[];
    },
    enabled: !!versionId,
  });
}

export function useGenerateDraftVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      variantType,
    }: {
      versionId: string;
      variantType: PolicyVariantType;
    }) => {
      const { data, error } = await supabase.functions.invoke('policy-draft-variants', {
        body: { versionId, variantType },
      });
      if (error) {
        // Edge function returns structured errors in data even on failure status
        const msg =
          (data as { error?: string } | null)?.error ?? error.message ?? 'Draft failed';
        throw new Error(msg);
      }
      return data as { success: boolean; jobId: string; output_md: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['policy-variants', vars.versionId] });
      qc.invalidateQueries({ queryKey: ['policy-draft-jobs', vars.versionId] });
      toast({
        title: 'Draft generated',
        description: 'Generated draft ready for review.',
      });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not generate draft',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

export function useApprovePolicyVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, versionId }: { variantId: string; versionId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('policy_variants')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: userData.user?.id ?? null,
        })
        .eq('id', variantId);
      if (error) throw error;
      return { variantId, versionId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['policy-variants', res.versionId] });
      toast({ title: 'Variant approved', description: 'Marked as approved.' });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not approve',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVariantBody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      versionId,
      body_md,
    }: {
      variantId: string;
      versionId: string;
      body_md: string;
    }) => {
      const { error } = await supabase
        .from('policy_variants')
        .update({
          body_md,
          // editing AI output unsets approval; operator must re-approve
          approved: false,
          approved_at: null,
        })
        .eq('id', variantId);
      if (error) throw error;
      return { variantId, versionId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['policy-variants', res.versionId] });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not save edits',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}
