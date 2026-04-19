/**
 * Wave 28.7 — Handbook publish preflight.
 *
 * Returns blockers that prevent a handbook version from publishing. The
 * canonical blocker added in 28.7: any section whose `source = 'policy'`
 * but whose underlying policy lacks an approved internal variant. Other
 * structural blockers (empty title, no acknowledgment language, etc.)
 * are designed to be added here over time — keep this surface narrow.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type PreflightSeverity = 'blocker' | 'warning';

export interface PreflightIssue {
  id: string;
  severity: PreflightSeverity;
  sectionId?: string;
  sectionTitle?: string;
  policyId?: string;
  message: string;
  remediationHint: string;
}

export interface PreflightResult {
  blockers: PreflightIssue[];
  warnings: PreflightIssue[];
  canPublish: boolean;
}

export function useHandbookPublishPreflight(versionId: string | null | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['handbook-publish-preflight', versionId, orgId],
    enabled: !!versionId && !!orgId,
    queryFn: async (): Promise<PreflightResult> => {
      const blockers: PreflightIssue[] = [];
      const warnings: PreflightIssue[] = [];

      const { data: sections, error: sErr } = await (supabase as any)
        .from('org_handbook_sections')
        .select('id, title, source, policy_ref_id, policy_variant_type, draft_content')
        .eq('handbook_version_id', versionId);
      if (sErr) throw sErr;

      const policyIds = (sections ?? [])
        .filter((s: any) => s.source === 'policy' && s.policy_ref_id)
        .map((s: any) => s.policy_ref_id);

      let approvedByVersion = new Set<string>();
      let policyMeta = new Map<string, { current_version_id: string | null; internal_title: string }>();
      if (policyIds.length > 0) {
        const { data: policies } = await (supabase as any)
          .from('policies')
          .select('id, current_version_id, internal_title')
          .in('id', policyIds);
        for (const p of policies ?? []) {
          policyMeta.set(p.id, { current_version_id: p.current_version_id, internal_title: p.internal_title });
        }
        const versionIds = (policies ?? []).map((p: any) => p.current_version_id).filter(Boolean);
        if (versionIds.length > 0) {
          const { data: variants } = await (supabase as any)
            .from('policy_variants')
            .select('version_id')
            .in('version_id', versionIds)
            .eq('variant_type', 'internal')
            .eq('approved', true);
          approvedByVersion = new Set((variants ?? []).map((v: any) => v.version_id));
        }
      }

      for (const s of sections ?? []) {
        if (s.source === 'policy') {
          const meta = policyMeta.get(s.policy_ref_id);
          if (!meta || !meta.current_version_id || !approvedByVersion.has(meta.current_version_id)) {
            blockers.push({
              id: `policy-unapproved-${s.id}`,
              severity: 'blocker',
              sectionId: s.id,
              sectionTitle: s.title,
              policyId: s.policy_ref_id,
              message: `${s.title} is policy-backed, but the underlying policy has no approved internal draft.`,
              remediationHint: 'Open Policy OS and approve the internal variant.',
            });
          }
        } else if (s.source === 'custom') {
          if (!s.draft_content || s.draft_content.trim().length < 20) {
            warnings.push({
              id: `empty-draft-${s.id}`,
              severity: 'warning',
              sectionId: s.id,
              sectionTitle: s.title,
              message: `${s.title} has little or no draft content.`,
              remediationHint: 'Draft the section before publishing.',
            });
          }
        }
      }

      return { blockers, warnings, canPublish: blockers.length === 0 };
    },
    staleTime: 30 * 1000,
  });
}
