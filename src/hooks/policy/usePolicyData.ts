/**
 * Policy Operating System — data hooks (Wave 28.2)
 *
 * Read-side hooks for the policy library and per-org policy instances.
 * Mutations land in Wave 28.3+ (org setup wizard adopts policies into the org).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { Database } from '@/integrations/supabase/types';
import { usePolicyOrgProfile, isApplicableToProfile } from './usePolicyOrgProfile';

export type PolicyCategory = Database['public']['Enums']['policy_category'];
export type PolicyAudience = Database['public']['Enums']['policy_audience'];
export type PolicyStatus = Database['public']['Enums']['policy_status'];
export type PolicyRecommendation = Database['public']['Enums']['policy_recommendation'];
export type PolicySurface = Database['public']['Enums']['policy_surface'];

export interface PolicyLibraryEntry {
  id: string;
  key: string;
  category: PolicyCategory;
  audience: PolicyAudience;
  recommendation: PolicyRecommendation;
  title: string;
  short_description: string;
  why_it_matters: string | null;
  candidate_surfaces: PolicySurface[];
  default_owner_role: string | null;
  requires_extensions: boolean;
  requires_retail: boolean;
  requires_packages: boolean;
  requires_minors: boolean;
  // Compensation-aware applicability gates (Wave 3)
  requires_tip_pooling?: boolean;
  requires_refund_clawback?: boolean;
  requires_booth_rental?: boolean;
  requires_hourly_pay?: boolean;
  requires_product_cost_basis?: boolean;
  display_order: number;
  configurator_schema_key: string | null;
}

export interface OrgPolicy {
  id: string;
  organization_id: string;
  library_key: string;
  category: PolicyCategory;
  audience: PolicyAudience;
  internal_title: string;
  external_title: string | null;
  intent: string | null;
  status: PolicyStatus;
  primary_owner_role: string | null;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export const POLICY_CATEGORY_META: Record<
  PolicyCategory,
  { label: string; description: string; order: number }
> = {
  team: {
    label: 'Team & Employment',
    description: 'Internal policies governing staff, conduct, scheduling, compensation, and discipline.',
    order: 1,
  },
  client: {
    label: 'Client Experience',
    description: 'Booking, deposits, cancellations, refunds, redos, retail returns, and client-facing rules.',
    order: 2,
  },
  extensions: {
    label: 'Extensions',
    description: 'Consultation, custom orders, installation, maintenance, warranty, and removal.',
    order: 3,
  },
  financial: {
    label: 'Financial & Transactions',
    description: 'Payments, pricing transparency, chargebacks, promotions, and discount governance.',
    order: 4,
  },
  facility: {
    label: 'Facility & Liability',
    description: 'Safety, emergencies, property damage, lost items, and accessibility accommodation.',
    order: 5,
  },
  management: {
    label: 'Management & Exceptions',
    description: 'Exception authority, goodwill, escalation, and documentation — the missing layer that makes operations consistent.',
    order: 6,
  },
};

export const POLICY_STATUS_META: Record<
  PolicyStatus,
  { label: string; tone: 'neutral' | 'warning' | 'success' | 'muted' }
> = {
  not_started: { label: 'Not started', tone: 'muted' },
  drafting: { label: 'Drafting', tone: 'warning' },
  configured: { label: 'Configured', tone: 'neutral' },
  needs_review: { label: 'Needs review', tone: 'warning' },
  approved_internal: { label: 'Approved (internal)', tone: 'success' },
  published_external: { label: 'Published', tone: 'success' },
  wired: { label: 'Wired', tone: 'success' },
  archived: { label: 'Archived', tone: 'muted' },
};

/** Fetch the platform-wide library of recommended policies (47 entries). */
export function usePolicyLibrary() {
  return useQuery({
    queryKey: ['policy-library'],
    queryFn: async (): Promise<PolicyLibraryEntry[]> => {
      const { data, error } = await supabase
        .from('policy_library')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data as PolicyLibraryEntry[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch the policies the current org has adopted (instances). */
export function useOrgPolicies() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['org-policies', orgId],
    queryFn: async (): Promise<OrgPolicy[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data as OrgPolicy[]) ?? [];
    },
    enabled: !!orgId,
  });
}

export interface PolicySurfaceConflict {
  surface: PolicySurface;
  category: PolicyCategory;
  policy_keys: string[];
  policy_titles: string[];
}

export interface PolicyHealthSummary {
  total_recommended: number;
  adopted: number;
  /** Truly done: row has current_version_id AND status ∈ finalized set. */
  finalized: number;
  configured: number;
  published: number;
  wired: number;
  by_category: Record<PolicyCategory, { adopted: number; total: number; finalized: number }>;
  surface_conflicts: PolicySurfaceConflict[];
}

/**
 * A policy is "finalized" only when an approved version exists.
 * Adoption (a row in `policies`) is NOT completion — the wizard
 * bulk-adopts at status `not_started`/`drafting`, which would falsely
 * register as "done" if we counted row existence.
 *
 * See mem://architecture/structural-enforcement-gates — structure
 * (an approved version) precedes celebration.
 */
export function isPolicyFinalized(p?: OrgPolicy | null): boolean {
  if (!p) return false;
  if (!p.current_version_id) return false;
  return (
    p.status === 'configured' ||
    p.status === 'approved_internal' ||
    p.status === 'published_external' ||
    p.status === 'wired'
  );
}

/**
 * Fetch surface mappings for all of an org's adopted policies (current_version_id).
 * Used to detect surface conflicts (two policies of same category mapped to same surface).
 */
export function useOrgPolicySurfaceMappings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['org-policy-surface-mappings', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('policy_surface_mappings')
        .select('surface, version_id, enabled, policy_versions!inner(policy_id, policies!inner(library_key, category, internal_title, organization_id, current_version_id))')
        .eq('enabled', true);
      if (error) throw error;
      // Filter to current-version mappings only and this org
      return (data ?? []).filter((row: any) => {
        const pol = row.policy_versions?.policies;
        return (
          pol &&
          pol.organization_id === orgId &&
          pol.current_version_id === row.version_id
        );
      }) as Array<{
        surface: PolicySurface;
        version_id: string;
        policy_versions: {
          policy_id: string;
          policies: {
            library_key: string;
            category: PolicyCategory;
            internal_title: string;
            organization_id: string;
            current_version_id: string;
          };
        };
      }>;
    },
    enabled: !!orgId,
  });
}

/**
 * Compute lightweight health summary from library + adopted policies.
 *
 * Wave 28.11.8 — `total_recommended` and `by_category.total` are filtered
 * through `isApplicableToProfile` so phantom extension/retail/package/minor
 * policies never inflate denominators. Mirrors `useApplicableRequiredPolicies`.
 * When the profile hasn't loaded, no filtering happens (silence over wrong number).
 */
export function usePolicyHealthSummary() {
  const { data: library = [] } = usePolicyLibrary();
  const { data: adopted = [] } = useOrgPolicies();
  const { data: surfaceMappings = [] } = useOrgPolicySurfaceMappings();
  const { data: profile } = usePolicyOrgProfile();

  const adoptedKeys = new Set(adopted.map((p) => p.library_key));
  const recommendedLibrary = library.filter(
    (l) =>
      (l.recommendation === 'required' || l.recommendation === 'recommended') &&
      isApplicableToProfile(l, profile),
  );

  const by_category = (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).reduce(
    (acc, cat) => {
      const total = recommendedLibrary.filter((l) => l.category === cat).length;
      const adoptedCount = adopted.filter((p) => p.category === cat).length;
      acc[cat] = { adopted: adoptedCount, total };
      return acc;
    },
    {} as Record<PolicyCategory, { adopted: number; total: number }>,
  );

  // Surface conflict detection: group by (surface, category), flag groups with 2+ policies
  const buckets = new Map<string, { surface: PolicySurface; category: PolicyCategory; keys: Set<string>; titles: Set<string> }>();
  surfaceMappings.forEach((m) => {
    const pol = m.policy_versions.policies;
    const k = `${m.surface}::${pol.category}`;
    if (!buckets.has(k)) {
      buckets.set(k, { surface: m.surface, category: pol.category, keys: new Set(), titles: new Set() });
    }
    const b = buckets.get(k)!;
    b.keys.add(pol.library_key);
    b.titles.add(pol.internal_title);
  });
  const surface_conflicts: PolicySurfaceConflict[] = [];
  buckets.forEach((b) => {
    if (b.keys.size > 1) {
      surface_conflicts.push({
        surface: b.surface,
        category: b.category,
        policy_keys: Array.from(b.keys),
        policy_titles: Array.from(b.titles),
      });
    }
  });

  const summary: PolicyHealthSummary = {
    total_recommended: recommendedLibrary.length,
    adopted: adopted.length,
    configured: adopted.filter(
      (p) =>
        p.status === 'configured' ||
        p.status === 'approved_internal' ||
        p.status === 'published_external' ||
        p.status === 'wired',
    ).length,
    published: adopted.filter(
      (p) => p.status === 'published_external' || p.status === 'wired',
    ).length,
    wired: adopted.filter((p) => p.status === 'wired').length,
    by_category,
    surface_conflicts,
  };

  return summary;
}
