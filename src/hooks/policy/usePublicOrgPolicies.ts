/**
 * Wave 28.8 — Public Client Policy Center read hook.
 *
 * Fetches an org's adopted policies that:
 *   - have audience 'external' or 'both'
 *   - are status approved_internal / published_external / wired
 *   - have a current_version_id with is_published_external = true
 *   - have an approved `client` variant on that version
 *
 * Returns nothing (silent) when no qualifying policies exist — honors the
 * Visibility Contract doctrine.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  POLICY_CATEGORY_META,
  type PolicyCategory,
} from './usePolicyData';

export interface PublicPolicyEntry {
  policyId: string;
  libraryKey: string;
  category: PolicyCategory;
  title: string;
  bodyMd: string;
  approvedAt: string | null;
  versionNumber: number | null;
  requiresAcknowledgment: boolean;
}

export interface PublicPolicyGroup {
  category: PolicyCategory;
  label: string;
  description: string;
  order: number;
  policies: PublicPolicyEntry[];
}

export function usePublicOrgPolicies(orgId: string | undefined) {
  return useQuery({
    queryKey: ['public-org-policies', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PublicPolicyGroup[]> => {
      if (!orgId) return [];

      // Step 1: org's qualifying policies (RLS will further filter to publishable ones)
      const { data: policies, error: pErr } = await (supabase as any)
        .from('policies')
        .select(
          'id, library_key, category, audience, status, internal_title, external_title, current_version_id, requires_acknowledgment'
        )
        .eq('organization_id', orgId)
        .in('audience', ['external', 'both'])
        .in('status', ['approved_internal', 'published_external', 'wired']);
      if (pErr) throw pErr;
      if (!policies || policies.length === 0) return [];

      const versionIds = policies
        .map((p: any) => p.current_version_id)
        .filter(Boolean);
      if (versionIds.length === 0) return [];

      // Step 2: published versions (RLS enforces is_published_external)
      const { data: versions, error: vErr } = await (supabase as any)
        .from('policy_versions')
        .select('id, policy_id, version_number')
        .in('id', versionIds);
      if (vErr) throw vErr;

      const publishedVersionIds = new Set(
        (versions ?? []).map((v: any) => v.id as string)
      );
      if (publishedVersionIds.size === 0) return [];

      const versionByPolicyId = new Map<string, { id: string; version_number: number }>();
      for (const v of versions ?? []) versionByPolicyId.set(v.policy_id, v);

      // Step 3: approved client variants for those versions (RLS enforces all conditions)
      const { data: variants, error: varErr } = await (supabase as any)
        .from('policy_variants')
        .select('id, version_id, body_md, approved_at')
        .in('version_id', Array.from(publishedVersionIds))
        .eq('variant_type', 'client')
        .eq('approved', true);
      if (varErr) throw varErr;
      if (!variants || variants.length === 0) return [];

      const variantByVersion = new Map<string, any>();
      for (const v of variants) variantByVersion.set(v.version_id, v);

      // Step 4: assemble entries
      const entries: PublicPolicyEntry[] = [];
      for (const p of policies) {
        const v = versionByPolicyId.get(p.id);
        if (!v) continue;
        const variant = variantByVersion.get(v.id);
        if (!variant?.body_md) continue;
        entries.push({
          policyId: p.id,
          libraryKey: p.library_key,
          category: p.category as PolicyCategory,
          title: p.external_title || p.internal_title,
          bodyMd: variant.body_md,
          approvedAt: variant.approved_at,
          versionNumber: v.version_number ?? null,
          requiresAcknowledgment: !!p.requires_acknowledgment,
        });
      }

      // Step 5: group by category, ordered
      const byCategory = new Map<PolicyCategory, PublicPolicyEntry[]>();
      for (const e of entries) {
        if (!byCategory.has(e.category)) byCategory.set(e.category, []);
        byCategory.get(e.category)!.push(e);
      }

      const groups: PublicPolicyGroup[] = [];
      for (const [cat, list] of byCategory) {
        const meta = POLICY_CATEGORY_META[cat];
        groups.push({
          category: cat,
          label: meta?.label ?? cat,
          description: meta?.description ?? '',
          order: meta?.order ?? 99,
          policies: list.sort((a, b) => a.title.localeCompare(b.title)),
        });
      }

      return groups.sort((a, b) => a.order - b.order);
    },
  });
}
