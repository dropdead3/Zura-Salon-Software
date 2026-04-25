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
 * Two-step queries (no PostgREST embeds) to avoid FK-ambiguity
 * compile errors on tables with multiple relationships to `organizations`.
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
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let orgId: string | null = profile?.organization_id ?? null;

      // 2. Fallback: first admin/owner membership
      if (!orgId) {
        const { data: adminRow } = await supabase
          .from('organization_admins')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        orgId = adminRow?.organization_id ?? null;
      }

      if (!orgId) return { slug: null, name: null };

      const { data: org } = await supabase
        .from('organizations')
        .select('slug, name')
        .eq('id', orgId)
        .maybeSingle();

      return {
        slug: org?.slug ?? null,
        name: org?.name ?? null,
      };
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
