/**
 * Wave 28.7 — Resolve which handbook sections can be policy-backed for an org.
 *
 * Returns a Map<handbookSectionKey, AvailablePolicy[]> filtered to:
 *   - policies the org has adopted
 *   - whose current_version_id has an approved `internal` variant
 *
 * Used by SectionLibraryCard to show a 📋 chip and by HandbookSectionEditor
 * to surface the "Use policy-backed source" affordance.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { POLICY_SECTION_LINKS } from '@/lib/handbook/policySectionMap';

export interface AvailablePolicy {
  policyId: string;
  libraryKey: string;
  internalTitle: string;
  versionId: string;
  variantId: string;
  variantBody: string | null;
  approvedAt: string | null;
}

export function useHandbookPolicySections() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['handbook-policy-sections', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: policies, error: pErr } = await (supabase as any)
        .from('policies')
        .select('id, library_key, internal_title, current_version_id, status')
        .eq('organization_id', orgId);
      if (pErr) throw pErr;

      const versionIds = (policies ?? [])
        .map((p: any) => p.current_version_id)
        .filter(Boolean);
      if (versionIds.length === 0) return new Map<string, AvailablePolicy[]>();

      const { data: variants, error: vErr } = await (supabase as any)
        .from('policy_variants')
        .select('id, version_id, body_md, approved, approved_at, variant_type')
        .in('version_id', versionIds)
        .eq('variant_type', 'internal')
        .eq('approved', true);
      if (vErr) throw vErr;

      const variantByVersion = new Map<string, any>();
      for (const v of variants ?? []) variantByVersion.set(v.version_id, v);

      const out = new Map<string, AvailablePolicy[]>();
      for (const p of policies ?? []) {
        const variant = variantByVersion.get(p.current_version_id);
        if (!variant) continue;
        const links = POLICY_SECTION_LINKS.filter((l) => l.policyLibraryKey === p.library_key);
        for (const link of links) {
          if (!out.has(link.handbookSectionKey)) out.set(link.handbookSectionKey, []);
          out.get(link.handbookSectionKey)!.push({
            policyId: p.id,
            libraryKey: p.library_key,
            internalTitle: p.internal_title,
            versionId: p.current_version_id,
            variantId: variant.id,
            variantBody: variant.body_md,
            approvedAt: variant.approved_at,
          });
        }
      }
      return out;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Resolve content for a single handbook section row. If `source = 'policy'`,
 * pulls the variant body live. Otherwise returns the section's own draft_content.
 */
export function useResolvedHandbookSectionContent(section: any) {
  const isPolicy = section?.source === 'policy';
  const policyId = section?.policy_ref_id;
  return useQuery({
    queryKey: ['handbook-section-content', section?.id, section?.source, policyId],
    enabled: !!section,
    queryFn: async () => {
      if (!isPolicy) return { source: 'custom' as const, body: section?.draft_content ?? '', missing: false };
      if (!policyId) return { source: 'policy' as const, body: '', missing: true, reason: 'no_policy' };
      const { data: policy } = await (supabase as any)
        .from('policies')
        .select('current_version_id, internal_title')
        .eq('id', policyId)
        .maybeSingle();
      if (!policy?.current_version_id) {
        return { source: 'policy' as const, body: '', missing: true, reason: 'no_version' };
      }
      const { data: variant } = await (supabase as any)
        .from('policy_variants')
        .select('body_md, approved, approved_at')
        .eq('version_id', policy.current_version_id)
        .eq('variant_type', section?.policy_variant_type || 'internal')
        .maybeSingle();
      if (!variant?.approved) {
        return { source: 'policy' as const, body: '', missing: true, reason: 'not_approved', policyTitle: policy.internal_title };
      }
      return {
        source: 'policy' as const,
        body: variant.body_md ?? '',
        missing: false,
        policyTitle: policy.internal_title,
        approvedAt: variant.approved_at,
      };
    },
  });
}

/** Switch a section's source between 'policy' and 'custom'. */
export function useUpdateHandbookSectionSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sectionId: string;
      source: 'policy' | 'custom';
      policyRefId?: string | null;
      variantType?: 'internal' | 'client' | 'disclosure' | 'manager_note';
    }) => {
      const patch: Record<string, any> = { source: input.source };
      if (input.source === 'policy') {
        patch.policy_ref_id = input.policyRefId ?? null;
        patch.policy_variant_type = input.variantType ?? 'internal';
      } else {
        patch.policy_ref_id = null;
      }
      const { error } = await (supabase as any)
        .from('org_handbook_sections')
        .update(patch)
        .eq('id', input.sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['handbook'] });
      qc.invalidateQueries({ queryKey: ['handbook-section-content'] });
    },
  });
}
