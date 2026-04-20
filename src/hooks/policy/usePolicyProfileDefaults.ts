/**
 * Policy Profile Defaults
 *
 * Derives the structural facts that the Policy Setup Wizard would otherwise
 * re-ask. The wizard becomes a confirmation + judgment surface — operators
 * confirm what {{PLATFORM_NAME}} already knows, and only answer questions
 * the platform genuinely cannot infer.
 *
 * See: mem://features/policy-os-applicability-doctrine.md
 *      "Wizard inputs must be derived-by-default."
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';

export type TeamSizeBand = 'solo' | 'small' | 'medium' | 'large' | 'enterprise';

const bandFromCount = (count: number): TeamSizeBand => {
  if (count <= 1) return 'solo';
  if (count <= 5) return 'small';
  if (count <= 15) return 'medium';
  if (count <= 40) return 'large';
  return 'enterprise';
};

export interface PolicyProfileDefaults {
  /** Loading flag (any source still pending) */
  isLoading: boolean;

  // Derived structural facts
  business_type: string | null;
  primary_state: string | null;
  derived_states: string[];
  team_size_band: TeamSizeBand | null;
  team_size_count: number;
  service_categories: string[];
  service_category_labels: Record<string, string>;
  roles_used: string[];

  // Heuristic toggle defaults (operator can override)
  detected_offers_retail: boolean;
  detected_offers_extensions: boolean;
  detected_offers_packages: boolean;
  detected_offers_memberships: boolean;

  // Reasons (for "auto-detected from your X" labels)
  retail_reason: string | null;
  extensions_reason: string | null;
  packages_reason: string | null;
  memberships_reason: string | null;

  // Structural gates
  needs_location_setup: boolean;
  needs_services_setup: boolean;
  needs_team_setup: boolean;
}

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  cut: 'Cut & style',
  color: 'Color',
  extensions: 'Extensions',
  treatments: 'Treatments',
  barbering: 'Barbering',
  lash_brow: 'Lash & brow',
  nails: 'Nails',
  esthetics: 'Esthetics',
};

const formatCategoryLabel = (raw: string): string => {
  const normalized = raw.toLowerCase().trim();
  if (SERVICE_CATEGORY_LABELS[normalized]) return SERVICE_CATEGORY_LABELS[normalized];
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export function usePolicyProfileDefaults(): PolicyProfileDefaults {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  const { data: locations = [], isLoading: locationsLoading } = useLocations(orgId ?? undefined);

  // Active staff count + role distribution + service catalog + retail/package/membership presence
  const { data: derived, isLoading: derivedLoading } = useQuery({
    queryKey: ['policy-profile-defaults', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Run independent reads in parallel
      const [
        staffRes,
        servicesRes,
        productsRes,
        membershipsRes,
      ] = await Promise.all([
        supabase
          .from('employee_profiles')
          .select('user_id')
          .eq('organization_id', orgId!)
          .eq('is_active', true),
        supabase
          .from('services')
          .select('category')
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .eq('is_archived', false),
        supabase
          .from('products')
          .select('product_type')
          .eq('organization_id', orgId!)
          .eq('is_active', true),
        // Memberships table may not exist in every org's schema view — guard.
        supabase
          .from('membership_plans' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .then((r) => r, () => ({ count: 0, error: null }) as any),
      ]);

      const staffUserIds = (staffRes.data ?? []).map((s) => s.user_id).filter(Boolean) as string[];

      // Fetch role distribution for active staff only
      let roles: string[] = [];
      if (staffUserIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .in('user_id', staffUserIds);
        const set = new Set<string>();
        (rolesData ?? []).forEach((r: any) => {
          if (r?.role) set.add(String(r.role));
        });
        roles = Array.from(set);
      }

      // Service categories
      const catSet = new Set<string>();
      (servicesRes.data ?? []).forEach((s: any) => {
        if (s?.category) catSet.add(String(s.category).toLowerCase());
      });
      const serviceCategories = Array.from(catSet);

      // Heuristics from products
      const productTypes = new Set<string>(
        (productsRes.data ?? [])
          .map((p: any) => (p?.product_type ?? '').toLowerCase())
          .filter(Boolean),
      );
      const retailCount = (productsRes.data ?? []).filter(
        (p: any) => (p?.product_type ?? '').toLowerCase() === 'retail',
      ).length;
      const packageCount = (productsRes.data ?? []).filter((p: any) =>
        ['package', 'series', 'bundle'].includes((p?.product_type ?? '').toLowerCase()),
      ).length;

      const membershipCount = (membershipsRes as any)?.count ?? 0;

      return {
        staffCount: staffUserIds.length,
        roles,
        serviceCategories,
        retailCount,
        packageCount,
        membershipCount,
        productTypes: Array.from(productTypes),
      };
    },
  });

  return useMemo<PolicyProfileDefaults>(() => {
    const isLoading = !!orgId && (locationsLoading || derivedLoading);

    const activeLocations = locations.filter((l) => l.is_active !== false);
    const states = Array.from(
      new Set(
        activeLocations
          .map((l) => l.state_province)
          .filter((s): s is string => typeof s === 'string' && s.length > 0),
      ),
    );
    const primaryState = states[0] ?? null;

    const staffCount = derived?.staffCount ?? 0;
    const teamBand: TeamSizeBand | null = staffCount > 0 ? bandFromCount(staffCount) : null;

    const serviceCategories = derived?.serviceCategories ?? [];
    const labels: Record<string, string> = {};
    serviceCategories.forEach((c) => {
      labels[c] = formatCategoryLabel(c);
    });

    const roles = derived?.roles ?? [];

    const retailCount = derived?.retailCount ?? 0;
    const packageCount = derived?.packageCount ?? 0;
    const membershipCount = derived?.membershipCount ?? 0;

    const offersExtensions = serviceCategories.some((c) => c.includes('extension'));

    return {
      isLoading,
      business_type: effectiveOrganization?.business_type ?? null,
      primary_state: primaryState,
      derived_states: states,
      team_size_band: teamBand,
      team_size_count: staffCount,
      service_categories: serviceCategories,
      service_category_labels: labels,
      roles_used: roles,

      detected_offers_retail: retailCount > 0,
      detected_offers_extensions: offersExtensions,
      detected_offers_packages: packageCount > 0,
      detected_offers_memberships: membershipCount > 0,

      retail_reason: retailCount > 0 ? `${retailCount} retail product${retailCount === 1 ? '' : 's'} in inventory` : null,
      extensions_reason: offersExtensions ? 'extension services in your catalog' : null,
      packages_reason: packageCount > 0 ? `${packageCount} package${packageCount === 1 ? '' : 's'} in your catalog` : null,
      memberships_reason: membershipCount > 0 ? `${membershipCount} active membership plan${membershipCount === 1 ? '' : 's'}` : null,

      needs_location_setup: !isLoading && activeLocations.length === 0,
      needs_services_setup: !isLoading && serviceCategories.length === 0,
      needs_team_setup: !isLoading && staffCount === 0,
    };
  }, [
    orgId,
    locationsLoading,
    derivedLoading,
    locations,
    derived,
    effectiveOrganization?.business_type,
  ]);
}

export const TEAM_BAND_LABELS: Record<TeamSizeBand, string> = {
  solo: 'Solo (1)',
  small: 'Small (2–5)',
  medium: 'Medium (6–15)',
  large: 'Large (16–40)',
  enterprise: 'Enterprise (40+)',
};

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  salon: 'Salon',
  spa: 'Spa / wellness',
  esthetics: 'Esthetics',
  barbershop: 'Barbershop',
  med_spa: 'Med spa',
  wellness: 'Wellness',
  extensions_studio: 'Extensions studio',
  multi_service: 'Multi-service',
  other: 'Other',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  stylist_assistant: 'Stylist Assistant',
  admin_assistant: 'Admin Assistant',
  operations_assistant: 'Operations Assistant',
  booth_renter: 'Booth Renter',
  bookkeeper: 'Bookkeeper',
  inventory_manager: 'Inventory Manager',
};
