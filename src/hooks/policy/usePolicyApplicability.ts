/**
 * Policy Applicability + Surface Mapping hooks (Wave 28.5)
 *
 * Applicability = WHO a policy applies to (roles, employment types, locations,
 * service categories, audience). Surface mappings = WHERE it renders (handbook,
 * client_page, booking, checkout, intake, manager, sop) and the variant tone.
 *
 * Both are versioned: rows are keyed to a draft policy_version_id so historical
 * versions remain intact when a new draft is opened.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Book,
  Globe,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  ShieldAlert,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { PolicyOrgProfile } from './usePolicyOrgProfile';

export type PolicyScopeType = Database['public']['Enums']['policy_scope_type'];
export type PolicySurface = Database['public']['Enums']['policy_surface'];
export type PolicyVariantType = Database['public']['Enums']['policy_variant_type'];

export interface ApplicabilityRow {
  scope_type: PolicyScopeType;
  scope_value: string;
}

export interface SurfaceMappingRow {
  surface: PolicySurface;
  variant_type: PolicyVariantType;
  enabled: boolean;
  surface_config?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Applicability                                                              */
/* -------------------------------------------------------------------------- */

export function usePolicyApplicability(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-applicability', versionId],
    queryFn: async (): Promise<ApplicabilityRow[]> => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('policy_applicability')
        .select('scope_type, scope_value')
        .eq('version_id', versionId);
      if (error) throw error;
      return (data ?? []) as ApplicabilityRow[];
    },
    enabled: !!versionId,
  });
}

export function useSavePolicyApplicability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      rows,
    }: {
      versionId: string;
      rows: ApplicabilityRow[];
    }) => {
      const { error } = await supabase.rpc('save_policy_applicability', {
        p_version_id: versionId,
        p_rows: rows as never,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['policy-applicability', vars.versionId] });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not save applicability',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Surface mappings                                                           */
/* -------------------------------------------------------------------------- */

export function usePolicySurfaceMappings(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['policy-surfaces', versionId],
    queryFn: async (): Promise<SurfaceMappingRow[]> => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('policy_surface_mappings')
        .select('surface, variant_type, enabled, surface_config')
        .eq('version_id', versionId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        surface: r.surface as PolicySurface,
        variant_type: r.variant_type as PolicyVariantType,
        enabled: r.enabled,
        surface_config: (r.surface_config ?? {}) as Record<string, unknown>,
      }));
    },
    enabled: !!versionId,
  });
}

export function useSavePolicySurfaceMappings() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async ({
      versionId,
      rows,
    }: {
      versionId: string;
      rows: SurfaceMappingRow[];
    }) => {
      const { error } = await supabase.rpc('save_policy_surface_mappings', {
        p_version_id: versionId,
        p_rows: rows as never,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['policy-surfaces', vars.versionId] });
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
    },
    onError: (e: Error) => {
      toast({
        title: 'Could not save surfaces',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Surface audience tagging (Wave 28.11.4):
 *   - 'internal'  → renders only inside staff-facing tools (handbook, manager, sop)
 *   - 'external'  → renders only on client-facing surfaces (client_page, booking, checkout)
 *   - 'both'      → may render on either side (intake — staff use the intake form too)
 *
 * Used by `PolicySurfaceEditor` to filter candidate surfaces by `policy.audience ∩ surface.audience`,
 * and by `usePolicyForSurface` to drop mappings whose policy audience doesn't include the surface's
 * audience. Single source of truth — no leakage from configurator chrome to data layer.
 */
export type SurfaceAudience = 'internal' | 'external' | 'both';

export const SURFACE_META: Record<
  PolicySurface,
  {
    label: string;
    description: string;
    defaultVariant: PolicyVariantType;
    icon: LucideIcon;
    shortLabel: string;
    audience: SurfaceAudience;
  }
> = {
  handbook: {
    label: 'Employee Handbook',
    shortLabel: 'Handbook',
    description: 'Lives in the staff handbook for your team to reference.',
    defaultVariant: 'internal',
    icon: Book,
    audience: 'internal',
  },
  client_page: {
    label: 'Client Policy Page',
    shortLabel: 'Client',
    description: 'Shown on your public policy page that clients can browse anytime.',
    defaultVariant: 'client',
    icon: Globe,
    audience: 'external',
  },
  booking: {
    label: 'Booking Disclosure',
    shortLabel: 'Booking',
    description: 'Shown to clients right before they confirm a booking.',
    defaultVariant: 'disclosure',
    icon: CalendarCheck,
    audience: 'external',
  },
  checkout: {
    label: 'Checkout Enforcement',
    shortLabel: 'Checkout',
    description: 'Applied at checkout — deposits, fees, and surcharges.',
    defaultVariant: 'disclosure',
    icon: CreditCard,
    audience: 'external',
  },
  intake: {
    label: 'Consultation / Intake',
    shortLabel: 'Intake',
    description: 'Clients agree to this during consultation or intake.',
    defaultVariant: 'client',
    icon: ClipboardList,
    audience: 'both',
  },
  manager: {
    label: 'Manager Decision Card',
    shortLabel: 'Manager',
    description: 'Quick reference for managers when staff need an exception call.',
    defaultVariant: 'manager_note',
    icon: ShieldAlert,
    audience: 'internal',
  },
  sop: {
    label: 'Standard Operating Procedure',
    shortLabel: 'SOP',
    description: 'Step-by-step guide your team follows to do this consistently.',
    defaultVariant: 'internal',
    icon: ListChecks,
    audience: 'internal',
  },
};

/**
 * Returns true if a policy with the given audience is allowed to render to a
 * surface with the given audience. Intersection rule:
 *   - policy=internal  → only internal surfaces (or 'both' surfaces like intake)
 *   - policy=external  → only external surfaces (or 'both')
 *   - policy=both      → all surfaces
 *   - surface=both     → accepts any policy audience
 */
export function isSurfaceCompatibleWithAudience(
  policyAudience: 'internal' | 'external' | 'both',
  surfaceAudience: SurfaceAudience,
): boolean {
  if (policyAudience === 'both' || surfaceAudience === 'both') return true;
  return policyAudience === surfaceAudience;
}

/**
 * Wave 28.11.5 — Per-policy default variant for surfaces tagged `audience: 'both'`.
 *
 * `SURFACE_META.intake.defaultVariant` is `'client'`, but for an `internal`-only
 * policy the audience filter strips the `client` variant — the operator would
 * see "intake enabled" with no rendered body. This helper picks an audience-
 * appropriate seed so that doesn't happen.
 */
export function defaultVariantForSurface(
  surface: PolicySurface,
  policyAudience: 'internal' | 'external' | 'both',
): PolicyVariantType {
  const meta = SURFACE_META[surface];
  if (meta.audience !== 'both') return meta.defaultVariant;
  // Surface accepts both; bias the seed by policy audience.
  if (policyAudience === 'internal') return 'internal';
  if (policyAudience === 'external') return 'client';
  return meta.defaultVariant;
}

/**
 * Seed applicability rows from the org profile (28.3) so freshly adopted
 * policies inherit org reality (roles_used, service_categories, locations,
 * compensation_models_in_use). The operator can deselect any chip before
 * saving.
 *
 * `relevantScopes` (optional) filters which scope lanes get seeded — passed
 * by the editor so policies with narrow scope manifests don't get spurious
 * rows for irrelevant lanes (e.g., HR policies don't seed Service category).
 * Wave 28.5+: the Applicability editor always passes this; the param stays
 * optional for backward compatibility with any callers that don't.
 */
export function seedApplicabilityFromProfile(
  profile: PolicyOrgProfile | null,
  locations: Array<{ id: string }>,
  options?: {
    relevantScopes?: PolicyScopeType[];
    audienceLocked?: boolean;
    lockedAudience?: 'internal' | 'external' | 'both';
  },
): ApplicabilityRow[] {
  if (!profile) return [];
  const allowed = options?.relevantScopes
    ? new Set<PolicyScopeType>(options.relevantScopes)
    : null; // null = no filter (all lanes allowed)
  const allow = (s: PolicyScopeType) => !allowed || allowed.has(s);
  const out: ApplicabilityRow[] = [];
  if (allow('role')) {
    (profile.roles_used ?? []).forEach((r) =>
      out.push({ scope_type: 'role', scope_value: r }),
    );
  }
  if (allow('service_category')) {
    (profile.service_categories ?? []).forEach((s) =>
      out.push({ scope_type: 'service_category', scope_value: s }),
    );
  }
  if (allow('employment_type')) {
    (profile.compensation_models_in_use ?? []).forEach((m) =>
      out.push({ scope_type: 'employment_type', scope_value: m }),
    );
  }
  if (allow('location')) {
    locations.forEach((l) => out.push({ scope_type: 'location', scope_value: l.id }));
  }
  // When the audience is locked by the library, persist a single audience
  // row so downstream surface-mapping continues to filter correctly.
  if (options?.audienceLocked && options.lockedAudience) {
    out.push({ scope_type: 'audience', scope_value: options.lockedAudience });
  }
  return out;
}

export const SCOPE_TYPE_META: Record<
  PolicyScopeType,
  { label: string; description: string }
> = {
  role: { label: 'Role', description: 'Limit to specific staff roles.' },
  employment_type: {
    label: 'Employment type',
    description: 'Apply only to W2 / 1099 / booth renters etc.',
  },
  service_category: {
    label: 'Service category',
    description: 'Apply only to specific service categories.',
  },
  location: { label: 'Location', description: 'Limit to specific locations.' },
  audience: { label: 'Audience', description: 'Internal vs. client-facing audience.' },
};

export const VARIANT_META: Record<PolicyVariantType, { label: string; description: string }> = {
  internal: { label: 'Internal', description: 'Full operational detail for staff.' },
  client: { label: 'Client', description: 'Plain-language version for clients.' },
  disclosure: {
    label: 'Disclosure',
    description: 'One-sentence summary for in-flow disclosure.',
  },
  manager_note: {
    label: 'Manager note',
    description: 'Decision-card guidance for managers.',
  },
};

/** Default scope values per scope_type, used when adding a row. */
export const DEFAULT_SCOPE_VALUES: Record<PolicyScopeType, { value: string; label: string }[]> = {
  role: [
    { value: 'owner', label: 'Owner' },
    { value: 'manager', label: 'Manager' },
    { value: 'lead_stylist', label: 'Lead Stylist' },
    { value: 'stylist', label: 'Stylist' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'front_desk', label: 'Front Desk' },
    { value: 'apprentice', label: 'Apprentice' },
  ],
  employment_type: [
    { value: 'w2', label: 'W2 employee' },
    { value: '1099', label: '1099 contractor' },
    { value: 'booth_renter', label: 'Booth renter' },
    { value: 'commission', label: 'Commission' },
    { value: 'hourly', label: 'Hourly' },
  ],
  service_category: [
    { value: 'color', label: 'Color' },
    { value: 'cut', label: 'Cut' },
    { value: 'extensions', label: 'Extensions' },
    { value: 'treatment', label: 'Treatment' },
    { value: 'styling', label: 'Styling' },
  ],
  location: [], // populated dynamically
  audience: [
    { value: 'internal', label: 'Internal' },
    { value: 'external', label: 'Client-facing' },
  ],
};
