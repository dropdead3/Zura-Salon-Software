/**
 * Policy Configurator hooks (Wave 28.4)
 *
 * Adopt-and-init a single policy, load its current draft version + rule blocks,
 * and save structured rule blocks back atomically.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  effective_from: string;
  effective_to: string | null;
  approved_by: string | null;
  approved_at: string | null;
  changelog_summary: string | null;
}

export interface PolicyRuleBlock {
  id: string;
  version_id: string;
  block_key: string;
  rule_type: string;
  value: unknown;
  required: boolean;
  ordering: number;
}

export interface PolicyConfiguratorPayload {
  policyId: string;
  versionId: string;
  blocks: PolicyRuleBlock[];
  versionNumber: number;
}

/** Adopt a single policy from the library and ensure a draft version exists. */
export function useAdoptAndInitPolicy() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (libraryKey: string) => {
      if (!orgId) throw new Error('No organization context');
      const { data, error } = await supabase.rpc('adopt_and_init_policy', {
        p_organization_id: orgId,
        p_library_key: libraryKey,
      });
      if (error) throw error;
      return data as string; // policy id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not open policy', description: e.message, variant: 'destructive' });
    },
  });
}

/** Load the current draft version + its rule blocks for a given policy. */
export function usePolicyConfiguratorData(libraryKey: string | null | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['policy-configurator', orgId, libraryKey],
    queryFn: async (): Promise<PolicyConfiguratorPayload | null> => {
      if (!orgId || !libraryKey) return null;
      // Fetch policy by (org, library_key)
      const { data: policy, error: pErr } = await supabase
        .from('policies')
        .select('id, current_version_id, requires_acknowledgment')
        .eq('organization_id', orgId)
        .eq('library_key', libraryKey)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!policy) return null;

      // Get current version (use current_version_id if present, else latest open version)
      const { data: version, error: vErr } = await supabase
        .from('policy_versions')
        .select('*')
        .eq('policy_id', policy.id)
        .is('effective_to', null)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!version) {
        return {
          policyId: policy.id,
          versionId: '',
          blocks: [],
          versionNumber: 0,
          requiresAcknowledgment: !!(policy as any).requires_acknowledgment,
        };
      }

      const { data: blocks, error: bErr } = await supabase
        .from('policy_rule_blocks')
        .select('*')
        .eq('version_id', version.id)
        .order('ordering', { ascending: true });
      if (bErr) throw bErr;

      return {
        policyId: policy.id,
        versionId: version.id,
        versionNumber: version.version_number,
        blocks: (blocks ?? []) as PolicyRuleBlock[],
        requiresAcknowledgment: !!(policy as any).requires_acknowledgment,
      };
    },
    enabled: !!orgId && !!libraryKey,
  });
}

interface SaveBlocksInput {
  versionId: string;
  blocks: Array<{
    block_key: string;
    rule_type?: string;
    value: unknown;
    required?: boolean;
  }>;
}

/** Replace the rule block set on a draft version. */
export function useSavePolicyRuleBlocks() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async ({ versionId, blocks }: SaveBlocksInput) => {
      const { error } = await supabase.rpc('save_policy_rule_blocks', {
        p_version_id: versionId,
        p_blocks: blocks as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-configurator', orgId] });
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      toast({ title: 'Policy saved', description: 'Rules updated. Drafting is the next step.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not save policy', description: e.message, variant: 'destructive' });
    },
  });
}
