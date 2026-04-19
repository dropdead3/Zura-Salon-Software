import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

// ─── Types ───────────────────────────────────────────────────────
export interface StylistExclusionSummary {
  /** Categories where the stylist is excluded from EVERY service in that category. */
  categories: string[];
  /** Individual excluded services that don't roll up to a full-category exclusion. */
  services: string[];
}

/**
 * Returns a Map<userId, { categories, services }> describing what each stylist
 * does NOT perform, derived from `staff_service_qualifications` (the existing
 * "Stylist Service Assignments" configurator).
 *
 * Rules:
 *  - A service is "excluded" if there is no `staff_service_qualifications` row
 *    for (user_id, service_id) OR the row has `is_active = false`.
 *  - If every service in a category is excluded for a stylist, we collapse
 *    those into a single category entry and omit the individual services.
 *  - Only considers active service-provider roles (stylist / stylist_assistant
 *    / booth_renter) within the current organization.
 */
export function useStylistExclusionSummaries() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-exclusion-summaries', orgId],
    queryFn: async () => {
      // 1. Identify service-provider users in this org.
      const SERVICE_PROVIDER_ROLES = ['stylist', 'stylist_assistant', 'booth_renter'] as const;
      const [rolesRes, employeesRes, servicesRes] = await Promise.all([
        supabase.from('user_roles').select('user_id').in('role', [...SERVICE_PROVIDER_ROLES]),
        supabase
          .from('employee_profiles')
          .select('user_id')
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .eq('is_approved', true),
        supabase
          .from('services')
          .select('id, name, category')
          .eq('organization_id', orgId!)
          .eq('is_active', true),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (servicesRes.error) throw servicesRes.error;

      const providerUserIds = new Set((rolesRes.data ?? []).map((r: any) => r.user_id));
      const stylistUserIds = (employeesRes.data ?? [])
        .map((e: any) => e.user_id)
        .filter((uid: string) => providerUserIds.has(uid));

      const services = (servicesRes.data ?? []) as Array<{
        id: string;
        name: string;
        category: string | null;
      }>;

      const summaries = new Map<string, StylistExclusionSummary>();
      if (stylistUserIds.length === 0 || services.length === 0) return summaries;

      // 2. Build category → service[] map for the org.
      const servicesByCategory = new Map<string, Array<{ id: string; name: string }>>();
      for (const s of services) {
        const cat = s.category || 'Uncategorized';
        if (!servicesByCategory.has(cat)) servicesByCategory.set(cat, []);
        servicesByCategory.get(cat)!.push({ id: s.id, name: s.name });
      }
      const serviceIdToName = new Map(services.map((s) => [s.id, s.name]));

      // 3. Fetch all qualification rows for these stylists (single query).
      const { data: qualRows, error: qualErr } = await supabase
        .from('staff_service_qualifications')
        .select('user_id, service_id, is_active')
        .in('user_id', stylistUserIds);
      if (qualErr) throw qualErr;

      // qualifiedByUser: user_id → Set of service_ids where is_active = true
      const qualifiedByUser = new Map<string, Set<string>>();
      for (const uid of stylistUserIds) qualifiedByUser.set(uid, new Set());
      for (const row of (qualRows ?? []) as any[]) {
        if (row.is_active === false) continue;
        qualifiedByUser.get(row.user_id)?.add(row.service_id);
      }

      // 4. For each stylist, derive excluded services & roll up to category.
      for (const userId of stylistUserIds) {
        const qualified = qualifiedByUser.get(userId)!;
        const excludedCategories: string[] = [];
        const excludedServices: string[] = [];

        for (const [cat, catServices] of servicesByCategory.entries()) {
          const excludedInCat = catServices.filter((s) => !qualified.has(s.id));
          if (excludedInCat.length === 0) continue;
          if (excludedInCat.length === catServices.length) {
            // Every service in this category is excluded → collapse.
            excludedCategories.push(cat);
          } else {
            excludedServices.push(...excludedInCat.map((s) => s.name));
          }
        }

        if (excludedCategories.length > 0 || excludedServices.length > 0) {
          summaries.set(userId, {
            categories: excludedCategories.sort(),
            services: excludedServices.sort(),
          });
        }
      }

      return summaries;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
