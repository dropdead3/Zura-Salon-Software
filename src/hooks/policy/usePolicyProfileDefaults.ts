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
 *      "Multi-state orgs apply policies per jurisdiction. operating_states is
 *       the source of truth; primary_state is a legacy mirror."
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations, type Location } from '@/hooks/useLocations';

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
  derived_state_names: string[];
  team_size_band: TeamSizeBand | null;
  team_size_count: number;
  service_categories: string[];
  service_category_labels: Record<string, string>;
  service_category_counts: Record<string, number>;
  roles_used: string[];
  role_counts: Record<string, number>;

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
  team_size_reason: string | null;

  // Structural gates
  needs_location_setup: boolean;
  needs_services_setup: boolean;
  needs_team_setup: boolean;
  needs_state_resolution: boolean;
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

// ── State derivation ──────────────────────────────────────────────────
const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

export const STATE_NAME_BY_CODE: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const NAME_TO_CODE: Record<string, string> = Object.entries(STATE_NAME_BY_CODE).reduce(
  (acc, [code, name]) => {
    acc[name.toLowerCase()] = code;
    return acc;
  },
  {} as Record<string, string>,
);

function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already a 2-letter code?
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && US_STATE_CODES.has(upper)) return upper;
  // Full name?
  const code = NAME_TO_CODE[trimmed.toLowerCase()];
  if (code) return code;
  return null;
}

/**
 * Extract a US state code from a Location, falling back through:
 *   1. state_province column (if populated)
 *   2. city field with embedded state — "Mesa, AZ 85203" or "Gilbert, AZ"
 *   3. address trailing pattern — "...Suite 1, Phoenix AZ 85020"
 */
export function extractState(loc: Pick<Location, 'state_province' | 'city' | 'address'>): string | null {
  // 1. Use state_province if populated
  const fromColumn = normalizeState(loc.state_province);
  if (fromColumn) return fromColumn;

  // 2. Parse city: matches ", AZ" or ", AZ 85203"
  if (loc.city) {
    const cityMatch = loc.city.match(/,\s*([A-Za-z]{2})(?:\s+\d{5})?\s*$/);
    if (cityMatch) {
      const code = cityMatch[1].toUpperCase();
      if (US_STATE_CODES.has(code)) return code;
    }
  }

  // 3. Parse trailing address: "STATE ZIP" anywhere in the string
  if (loc.address) {
    const addrMatch = loc.address.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
    if (addrMatch) {
      const code = addrMatch[1].toUpperCase();
      if (US_STATE_CODES.has(code)) return code;
    }
  }

  return null;
}

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
      const roleCounts: Record<string, number> = {};
      if (staffUserIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role, user_id')
          .in('user_id', staffUserIds);
        const set = new Set<string>();
        (rolesData ?? []).forEach((r: any) => {
          if (r?.role) {
            const role = String(r.role);
            set.add(role);
            roleCounts[role] = (roleCounts[role] ?? 0) + 1;
          }
        });
        roles = Array.from(set);
      }

      // Service categories + counts per category
      const categoryCounts: Record<string, number> = {};
      (servicesRes.data ?? []).forEach((s: any) => {
        if (s?.category) {
          const c = String(s.category).toLowerCase();
          categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
        }
      });
      const serviceCategories = Object.keys(categoryCounts);

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
        roleCounts,
        serviceCategories,
        categoryCounts,
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

    // Derive states from each active location with multi-fallback parser
    const stateCodes: string[] = [];
    const seen = new Set<string>();
    activeLocations.forEach((loc) => {
      const code = extractState(loc);
      if (code && !seen.has(code)) {
        seen.add(code);
        stateCodes.push(code);
      }
    });
    const stateNames = stateCodes.map((c) => STATE_NAME_BY_CODE[c] ?? c);
    const primaryState = stateCodes[0] ?? null;

    const staffCount = derived?.staffCount ?? 0;
    const teamBand: TeamSizeBand | null = staffCount > 0 ? bandFromCount(staffCount) : null;

    const serviceCategories = derived?.serviceCategories ?? [];
    const categoryCounts = derived?.categoryCounts ?? {};
    const labels: Record<string, string> = {};
    serviceCategories.forEach((c) => {
      labels[c] = formatCategoryLabel(c);
    });

    const roles = derived?.roles ?? [];
    const roleCounts = derived?.roleCounts ?? {};

    const retailCount = derived?.retailCount ?? 0;
    const packageCount = derived?.packageCount ?? 0;
    const membershipCount = derived?.membershipCount ?? 0;

    const offersExtensions = serviceCategories.some((c) => c.includes('extension'));

    const needsLocationSetup = !isLoading && activeLocations.length === 0;
    // State resolution gap: locations exist but none yielded a state
    const needsStateResolution = !isLoading && activeLocations.length > 0 && stateCodes.length === 0;

    return {
      isLoading,
      business_type: effectiveOrganization?.business_type ?? null,
      primary_state: primaryState,
      derived_states: stateCodes,
      derived_state_names: stateNames,
      team_size_band: teamBand,
      team_size_count: staffCount,
      service_categories: serviceCategories,
      service_category_labels: labels,
      service_category_counts: categoryCounts,
      roles_used: roles,
      role_counts: roleCounts,

      detected_offers_retail: retailCount > 0,
      detected_offers_extensions: offersExtensions,
      detected_offers_packages: packageCount > 0,
      detected_offers_memberships: membershipCount > 0,

      retail_reason: retailCount > 0 ? `${retailCount} retail product${retailCount === 1 ? '' : 's'} in inventory` : null,
      extensions_reason: offersExtensions ? 'extension services in your catalog' : null,
      packages_reason: packageCount > 0 ? `${packageCount} package${packageCount === 1 ? '' : 's'} in your catalog` : null,
      memberships_reason: membershipCount > 0 ? `${membershipCount} active membership plan${membershipCount === 1 ? '' : 's'}` : null,
      team_size_reason: staffCount > 0 ? `Based on ${staffCount} active staff` : null,

      needs_location_setup: needsLocationSetup,
      needs_services_setup: !isLoading && serviceCategories.length === 0,
      needs_team_setup: !isLoading && staffCount === 0,
      needs_state_resolution: needsStateResolution,
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
