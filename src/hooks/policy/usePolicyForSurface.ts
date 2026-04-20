/**
 * Wave 28.11.2 — Policy Surface Consumer
 *
 * Reads `policy_surface_mappings` for a given organization + surface and
 * resolves each enabled mapping to its approved variant body. This is the
 * primitive that fulfills the Policy OS North Star: "Configure once, render
 * everywhere." Booking, checkout, intake, manager, and SOP surfaces all
 * consume policies through this single hook.
 *
 * Visibility contract: returns an empty array when no qualifying policies
 * exist. Consumers (e.g. <PolicyDisclosure />) should render nothing in
 * that case — silence is valid output.
 *
 * Resolution rules per mapping:
 *   1. Filter to current_version_id + enabled = true
 *   2. Look up the variant matching the mapping's variant_type, approved=true
 *   3. Fall back to an approved 'client' variant if the requested type is
 *      missing (so a salon configuring "disclosure" but only approving the
 *      client copy still gets coverage)
 *   4. Skip the mapping silently if no approved variant is available
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PolicySurface, PolicyCategory } from './usePolicyData';
import type { PolicyVariantType } from './usePolicyApplicability';

export interface SurfacePolicyEntry {
  policyId: string;
  versionId: string;
  libraryKey: string;
  category: PolicyCategory;
  title: string;
  bodyMd: string;
  variantType: PolicyVariantType;
  /** True when we fell back from the requested variant to the 'client' variant. */
  fellBack: boolean;
  /** Optional surface-specific UI hints persisted on the mapping. */
  surfaceConfig: Record<string, unknown>;
  requiresAcknowledgment: boolean;
}

interface Options {
  /** Soft cap for high-density surfaces (e.g. checkout). 0 = no limit. */
  maxItems?: number;
}

export function usePolicyForSurface(
  orgId: string | null | undefined,
  surface: PolicySurface | null | undefined,
  options: Options = {},
) {
  const { maxItems = 0 } = options;

  return useQuery({
    queryKey: ['policy-for-surface', orgId, surface, maxItems],
    enabled: !!orgId && !!surface,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SurfacePolicyEntry[]> => {
      if (!orgId || !surface) return [];

      // 1) Enabled mappings for this surface scoped to current versions.
      //    Defensive: filter org and current_version_id in JS to honor multi-tenant
      //    isolation regardless of join-side RLS evaluation.
      const { data: rawMappings, error: mErr } = await supabase
        .from('policy_surface_mappings')
        .select(
          'surface, version_id, variant_type, enabled, surface_config, ' +
            'policy_versions!inner(id, policy_id, is_published_external, ' +
            'policies!inner(id, library_key, category, organization_id, ' +
            'current_version_id, internal_title, external_title, ' +
            'requires_acknowledgment, status, audience))',
        )
        .eq('surface', surface)
        .eq('enabled', true);
      if (mErr) throw mErr;

      const mappings = (rawMappings ?? []).filter((row: any) => {
        const pol = row?.policy_versions?.policies;
        if (!pol) return false;
        if (pol.organization_id !== orgId) return false;
        if (pol.current_version_id !== row.version_id) return false;
        // Only published external policies render on client-facing surfaces.
        // Internal-only surfaces (handbook, manager, sop) are gated by the
        // surface enum itself, but external surfaces still need the publish flag.
        const isClientFacing =
          surface === 'client_page' ||
          surface === 'booking' ||
          surface === 'checkout' ||
          surface === 'intake';
        if (isClientFacing && !row.policy_versions?.is_published_external) {
          return false;
        }
        return true;
      });

      if (mappings.length === 0) return [];

      const versionIds = Array.from(new Set(mappings.map((m: any) => m.version_id)));

      // 2) Pull approved variants for those versions. Grab everything; we
      //    pick the right type per mapping below (with client fallback).
      const { data: variants, error: vErr } = await supabase
        .from('policy_variants')
        .select('version_id, variant_type, body_md, approved')
        .in('version_id', versionIds)
        .eq('approved', true);
      if (vErr) throw vErr;

      const byVersion = new Map<string, Map<PolicyVariantType, string>>();
      for (const v of (variants ?? []) as Array<{
        version_id: string;
        variant_type: PolicyVariantType;
        body_md: string | null;
      }>) {
        if (!v.body_md) continue;
        if (!byVersion.has(v.version_id)) byVersion.set(v.version_id, new Map());
        byVersion.get(v.version_id)!.set(v.variant_type, v.body_md);
      }

      // 3) Assemble entries with fallback resolution.
      const entries: SurfacePolicyEntry[] = [];
      for (const raw of mappings) {
        const m = raw as {
          version_id: string;
          variant_type: PolicyVariantType;
          surface_config: Record<string, unknown> | null;
          policy_versions: {
            policies: {
              id: string;
              library_key: string;
              category: PolicyCategory;
              internal_title: string;
              external_title: string | null;
              requires_acknowledgment: boolean;
            };
          };
        };
        const pol = m.policy_versions.policies;
        const variantsForVersion = byVersion.get(m.version_id);
        if (!variantsForVersion) continue;

        const requested = m.variant_type;
        let body = variantsForVersion.get(requested);
        let fellBack = false;
        if (!body && requested !== 'client') {
          body = variantsForVersion.get('client');
          fellBack = !!body;
        }
        if (!body) continue;

        entries.push({
          policyId: pol.id,
          versionId: m.version_id,
          libraryKey: pol.library_key,
          category: pol.category,
          title: pol.external_title || pol.internal_title,
          bodyMd: body,
          variantType: fellBack ? 'client' : requested,
          fellBack,
          surfaceConfig: (m.surface_config ?? {}) as Record<string, unknown>,
          requiresAcknowledgment: !!pol.requires_acknowledgment,
        });
      }

      // Stable order: required-acknowledgment first, then alphabetical.
      entries.sort((a, b) => {
        if (a.requiresAcknowledgment !== b.requiresAcknowledgment) {
          return a.requiresAcknowledgment ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      });

      return maxItems > 0 ? entries.slice(0, maxItems) : entries;
    },
  });
}
