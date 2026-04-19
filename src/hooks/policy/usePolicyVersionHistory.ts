/**
 * Policy Version History hook (Wave 28.9)
 *
 * Reads `policy_versions` for a policy ordered newest-first, with nested
 * `policy_variants` so the diff view can compare body_md across versions.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PolicyVariantType } from './usePolicyDrafter';

export interface PolicyVersionVariant {
  id: string;
  variant_type: PolicyVariantType;
  body_md: string | null;
  approved: boolean;
  approved_at: string | null;
  last_drafted_at: string | null;
}

export interface PolicyVersionHistoryEntry {
  id: string;
  policy_id: string;
  version_number: number;
  effective_from: string | null;
  effective_to: string | null;
  approved_at: string | null;
  approved_by: string | null;
  changelog_summary: string | null;
  is_published_external: boolean;
  created_at: string;
  created_by: string | null;
  variants: PolicyVersionVariant[];
}

export function usePolicyVersionHistory(policyId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-version-history', policyId],
    queryFn: async (): Promise<PolicyVersionHistoryEntry[]> => {
      if (!policyId) return [];
      const { data, error } = await supabase
        .from('policy_versions')
        .select(
          `
          id,
          policy_id,
          version_number,
          effective_from,
          effective_to,
          approved_at,
          approved_by,
          changelog_summary,
          is_published_external,
          created_at,
          created_by,
          policy_variants (
            id,
            variant_type,
            body_md,
            approved,
            approved_at,
            last_drafted_at
          )
        `,
        )
        .eq('policy_id', policyId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        policy_id: row.policy_id,
        version_number: row.version_number,
        effective_from: row.effective_from,
        effective_to: row.effective_to,
        approved_at: row.approved_at,
        approved_by: row.approved_by,
        changelog_summary: row.changelog_summary,
        is_published_external: row.is_published_external,
        created_at: row.created_at,
        created_by: row.created_by,
        variants: (row.policy_variants ?? []) as PolicyVersionVariant[],
      }));
    },
    enabled: !!policyId,
  });
}
