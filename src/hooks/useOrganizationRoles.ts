/**
 * useOrganizationRoles
 *
 * Returns the distinct set of `app_role` values present in `user_roles`
 * for the currently effective organization, sorted by canonical display order.
 *
 * Used by the "Preview as" dropdown in the Dashboard Customize drawer so that
 * a primary owner can preview the dashboard for any role that actually exists
 * in their org — not a hardcoded subset of the enum.
 *
 * Excludes `super_admin` because it is a platform-level role and must never
 * appear in tenant-scoped UI even if a record exists.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { getRoleBadgeConfig } from '@/lib/roleBadgeConfig';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function useOrganizationRoles() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['organization-roles', orgId],
    queryFn: async (): Promise<AppRole[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('organization_id', orgId);

      if (error) throw error;

      const distinct = Array.from(
        new Set((data ?? []).map((r) => r.role as AppRole))
      );

      // Sort by the canonical badge order so dropdowns/legends/badges agree.
      distinct.sort(
        (a, b) => getRoleBadgeConfig(a).order - getRoleBadgeConfig(b).order
      );

      return distinct;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
