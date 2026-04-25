import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Provider-free resolver for the current user's primary org slug + name.
 *
 * Safe on ANY route — including marketing surfaces that live outside the
 * `OrganizationProvider` tree (per the Public vs Private Route Isolation
 * canon). Uses only `AuthProvider`, which wraps the entire app.
 *
 * Resolution order (matches `LegacyDashboardRedirect`):
 *   1. employee_profiles.organization_id (primary employment)
 *   2. organization_admins (first owner/admin membership)
 *
 * Returns nulls when:
 *   - no authenticated user
 *   - user has no org membership (falls through to /no-organization)
 *   - query in flight
 */
export function useUserPrimaryOrgSlug() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-primary-org-slug', user?.id],
    queryFn: async () => {
      if (!user?.id) return { slug: null, name: null };

      // 1. Primary employment org
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('organizations!employee_profiles_organization_id_fkey (slug, name)')
        .eq('user_id', user.id)
        .maybeSingle();

      const primary = (profile as any)?.organizations as { slug: string | null; name: string | null } | null;
      if (primary?.slug) {
        return { slug: primary.slug, name: primary.name ?? null };
      }

      // 2. First admin/owner membership
      const { data: adminRow } = await supabase
        .from('organization_admins')
        .select('organizations!organization_admins_organization_id_fkey (slug, name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const adminOrg = (adminRow as any)?.organizations as { slug: string | null; name: string | null } | null;
      if (adminOrg?.slug) {
        return { slug: adminOrg.slug, name: adminOrg.name ?? null };
      }

      return { slug: null, name: null };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    slug: query.data?.slug ?? null,
    name: query.data?.name ?? null,
    isLoading: query.isLoading,
  };
}
