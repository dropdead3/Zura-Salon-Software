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

export interface PolicyHealthSummary {
  total_recommended: number;
  adopted: number;
  configured: number;
  published: number;
  wired: number;
  by_category: Record<PolicyCategory, { adopted: number; total: number }>;
}

/** Compute lightweight health summary from library + adopted policies. */
export function usePolicyHealthSummary() {
  const { data: library = [] } = usePolicyLibrary();
  const { data: adopted = [] } = useOrgPolicies();

  const adoptedKeys = new Set(adopted.map((p) => p.library_key));
  const recommendedLibrary = library.filter(
    (l) => l.recommendation === 'required' || l.recommendation === 'recommended',
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
  };

  return summary;
}
