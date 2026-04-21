/**
 * Policy OS — Org profile hooks (Wave 28.3)
 *
 * Captures the business profile that drives smart recommendations
 * in the Policy Library. One row per organization.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { usePolicyLibrary, useOrgPolicies, type PolicyLibraryEntry } from './usePolicyData';

export interface PolicyOrgProfile {
  id: string;
  organization_id: string;
  business_type: string | null;
  /** @deprecated Legacy mirror of operating_states[0]. New code should read operating_states. */
  primary_state: string | null;
  /** Source of truth for jurisdictional applicability. Multi-state orgs apply policies per state. */
  operating_states: string[];
  team_size_band: string | null;
  offers_extensions: boolean;
  offers_retail: boolean;
  offers_packages: boolean;
  offers_memberships: boolean;
  serves_minors: boolean;
  has_existing_handbook: boolean;
  has_existing_client_policies: boolean;
  roles_used: string[];
  service_categories: string[];
  // Compensation-derived (auto-maintained by trigger from compensation_plans)
  compensation_models_in_use: string[];
  commission_basis_in_use: string[];
  uses_tip_pooling: boolean;
  uses_refund_clawback: boolean;
  has_booth_renters: boolean;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input shape for upserting the profile. Compensation-derived fields are
 * auto-maintained by a DB trigger when compensation_plans change, so they
 * remain optional from the client side.
 */
export type PolicyOrgProfileInput = Omit<
  PolicyOrgProfile,
  | 'id'
  | 'organization_id'
  | 'created_at'
  | 'updated_at'
  | 'setup_completed_at'
  | 'compensation_models_in_use'
  | 'commission_basis_in_use'
  | 'uses_tip_pooling'
  | 'uses_refund_clawback'
  | 'has_booth_renters'
> & {
  setup_completed_at?: string | null;
  compensation_models_in_use?: string[];
  commission_basis_in_use?: string[];
  uses_tip_pooling?: boolean;
  uses_refund_clawback?: boolean;
  has_booth_renters?: boolean;
};

export function usePolicyOrgProfile() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['policy-org-profile', orgId],
    queryFn: async (): Promise<PolicyOrgProfile | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('policy_org_profile')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data as PolicyOrgProfile | null) ?? null;
    },
    enabled: !!orgId,
  });
}

export function useUpsertPolicyOrgProfile() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: PolicyOrgProfileInput) => {
      if (!orgId) throw new Error('No organization context');
      const payload = {
        ...input,
        organization_id: orgId,
        created_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('policy_org_profile')
        .upsert(payload, { onConflict: 'organization_id' })
        .select()
        .single();
      if (error) throw error;
      return data as PolicyOrgProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-org-profile', orgId] });
      toast({ title: 'Profile saved', description: 'Recommendations updated.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not save profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAdoptPoliciesFromLibrary() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (libraryKeys: string[]) => {
      if (!orgId) throw new Error('No organization context');
      if (libraryKeys.length === 0) return [];
      const { data, error } = await supabase.rpc('adopt_policies_from_library', {
        p_organization_id: orgId,
        p_library_keys: libraryKeys,
      });
      if (error) throw error;
      return data as Array<{ policy_id: string; library_key: string; was_created: boolean }>;
    },
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      const created = rows.filter((r) => r.was_created).length;
      toast({
        title: created > 0 ? `Adopted ${created} ${created === 1 ? 'policy' : 'policies'}` : 'Already adopted',
        description: created > 0 ? 'They are ready to configure.' : 'These policies were already in your set.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not adopt policies',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Canonical applicability check — does this library entry apply to the org's
 * declared business profile? Mirrors recommendedKeysForProfile filter logic so
 * every surface (Library grid, configurator banner, future Command Center
 * tile, audit reports) uses the same source of truth.
 *
 * Doctrine: Any surface that counts, gates, or nags about required policies
 * MUST filter through this helper. See mem://features/policy-os-applicability-doctrine.
 *
 * Returns `true` when profile is null/undefined — we don't pre-hide before the
 * profile loads or when the operator hasn't completed setup.
 */
export function isApplicableToProfile(
  entry: Pick<
    PolicyLibraryEntry,
    | 'requires_extensions'
    | 'requires_retail'
    | 'requires_packages'
    | 'requires_minors'
    | 'requires_tip_pooling'
    | 'requires_refund_clawback'
    | 'requires_booth_rental'
    | 'requires_hourly_pay'
    | 'requires_product_cost_basis'
  >,
  profile: PolicyOrgProfile | null | undefined,
): boolean {
  if (!profile) return true;
  if (entry.requires_extensions && !profile.offers_extensions) return false;
  if (entry.requires_retail && !profile.offers_retail) return false;
  if (entry.requires_packages && !profile.offers_packages) return false;
  if (entry.requires_minors && !profile.serves_minors) return false;
  // Compensation-aware gates
  if (entry.requires_tip_pooling && !profile.uses_tip_pooling) return false;
  if (entry.requires_refund_clawback && !profile.uses_refund_clawback) return false;
  if (entry.requires_booth_rental && !profile.has_booth_renters) return false;
  if (
    entry.requires_hourly_pay &&
    !(profile.compensation_models_in_use ?? []).some((m) =>
      ['hourly_vs_commission', 'hourly_plus_commission'].includes(m),
    )
  ) {
    return false;
  }
  if (
    entry.requires_product_cost_basis &&
    !(profile.commission_basis_in_use ?? []).includes('net_of_product_cost')
  ) {
    return false;
  }
  return true;
}

/**
 * Returns the human-readable reason a policy is non-applicable, or `null` when
 * it IS applicable. Drives the configurator's quiet "no longer applies" banner.
 */
export function applicabilityReason(
  entry: Pick<
    PolicyLibraryEntry,
    | 'requires_extensions'
    | 'requires_retail'
    | 'requires_packages'
    | 'requires_minors'
    | 'requires_tip_pooling'
    | 'requires_refund_clawback'
    | 'requires_booth_rental'
    | 'requires_hourly_pay'
    | 'requires_product_cost_basis'
  >,
  profile: PolicyOrgProfile | null | undefined,
):
  | {
      service:
        | 'extensions'
        | 'retail'
        | 'packages'
        | 'minors'
        | 'tip_pooling'
        | 'refund_clawback'
        | 'booth_rental'
        | 'hourly_pay'
        | 'product_cost_basis';
      label: string;
    }
  | null {
  if (!profile) return null;
  if (entry.requires_extensions && !profile.offers_extensions) {
    return { service: 'extensions', label: 'extensions' };
  }
  if (entry.requires_retail && !profile.offers_retail) {
    return { service: 'retail', label: 'retail products' };
  }
  if (entry.requires_packages && !profile.offers_packages) {
    return { service: 'packages', label: 'packages or memberships' };
  }
  if (entry.requires_minors && !profile.serves_minors) {
    return { service: 'minors', label: 'minors (under 18)' };
  }
  if (entry.requires_tip_pooling && !profile.uses_tip_pooling) {
    return { service: 'tip_pooling', label: 'tip pooling' };
  }
  if (entry.requires_refund_clawback && !profile.uses_refund_clawback) {
    return { service: 'refund_clawback', label: 'refund clawback' };
  }
  if (entry.requires_booth_rental && !profile.has_booth_renters) {
    return { service: 'booth_rental', label: 'booth/chair rental' };
  }
  if (
    entry.requires_hourly_pay &&
    !(profile.compensation_models_in_use ?? []).some((m) =>
      ['hourly_vs_commission', 'hourly_plus_commission'].includes(m),
    )
  ) {
    return { service: 'hourly_pay', label: 'hourly pay' };
  }
  if (
    entry.requires_product_cost_basis &&
    !(profile.commission_basis_in_use ?? []).includes('net_of_product_cost')
  ) {
    return { service: 'product_cost_basis', label: 'net-of-product-cost commission' };
  }
  return null;
}

/**
 * Smart-recommend: filter library entries to those that apply to this org's profile.
 * - 'required' always recommended
 * - 'recommended' included when domain prerequisites match
 * - 'optional' excluded from recommendations (still browsable in the library)
 */
export function recommendedKeysForProfile(
  library: PolicyLibraryEntry[],
  profile: PolicyOrgProfile | null,
): string[] {
  if (!profile) {
    // Without a profile, recommend only required items
    return library.filter((l) => l.recommendation === 'required').map((l) => l.key);
  }
  return library
    .filter((l) => {
      if (!isApplicableToProfile(l, profile)) return false;
      return l.recommendation === 'required' || l.recommendation === 'recommended';
    })
    .map((l) => l.key);
}

/**
 * Canonical "required policies setup health" computation. Filters the library
 * through `isApplicableToProfile` against the org's profile so phantom
 * extension/retail/package policies never inflate the denominator. Use this
 * hook anywhere a Policies completion gauge is rendered (Library page,
 * future Command Center tile, audit/compliance reports).
 */
export function useApplicableRequiredPolicies() {
  const { data: library = [], isLoading: libLoading } = usePolicyLibrary();
  const { data: adopted = [], isLoading: adoptedLoading } = useOrgPolicies();
  const { data: profile, isLoading: profileLoading } = usePolicyOrgProfile();

  return useMemo(() => {
    const adoptedKeys = new Set(adopted.map((p) => p.library_key));
    const applicableRequired = library.filter(
      (l) => l.recommendation === 'required' && isApplicableToProfile(l, profile),
    );
    const adoptedCount = applicableRequired.filter((l) => adoptedKeys.has(l.key)).length;
    const total = applicableRequired.length;
    const pct = total > 0 ? Math.round((adoptedCount / total) * 100) : 0;
    const missing = applicableRequired.filter((l) => !adoptedKeys.has(l.key));
    return {
      total,
      adopted: adoptedCount,
      pct,
      missing,
      isComplete: total > 0 && adoptedCount === total,
      isLoading: libLoading || adoptedLoading || profileLoading,
    };
  }, [library, adopted, profile, libLoading, adoptedLoading, profileLoading]);
}
