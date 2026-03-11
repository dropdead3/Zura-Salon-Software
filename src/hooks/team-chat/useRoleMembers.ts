import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RoleMember {
  user_id: string;
  display_name: string;
  full_name: string | null;
  photo_url: string | null;
}

/**
 * Hook to get which users currently hold a specific role in the organization.
 * Used to show "Currently: Mike Johnson" in the welcome sender UI.
 */
export function useRoleMembers(role: AppRole | null) {
  const { effectiveOrganization } = useOrganizationContext();

  return useQuery({
    queryKey: ['role-members', effectiveOrganization?.id, role],
    queryFn: async (): Promise<RoleMember[]> => {
      if (!effectiveOrganization?.id || !role) return [];

      // Get users with this role
      const { data: usersWithRole, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);

      if (roleError) throw roleError;
      if (!usersWithRole?.length) return [];

      const userIds = usersWithRole.map(u => u.user_id);

      // Get employee profiles for these users in this org
      const { data: profiles, error: profileError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', effectiveOrganization.id)
        .in('user_id', userIds);

      if (profileError) throw profileError;

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name || p.full_name || 'Unknown',
        full_name: p.full_name,
        photo_url: p.photo_url,
      }));
    },
    enabled: !!effectiveOrganization?.id && !!role,
  });
}

/**
 * Hook to get members for multiple roles at once (batch query).
 * Returns a map of role -> members.
 */
export function useRoleMembersBatch(roles: AppRole[]) {
  const { effectiveOrganization } = useOrganizationContext();

  return useQuery({
    queryKey: ['role-members-batch', effectiveOrganization?.id, roles.join(',')],
    queryFn: async (): Promise<Record<AppRole, RoleMember[]>> => {
      if (!effectiveOrganization?.id || roles.length === 0) {
        return {} as Record<AppRole, RoleMember[]>;
      }

      // Get all users with any of these roles
      const { data: usersWithRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', roles);

      if (roleError) throw roleError;
      if (!usersWithRoles?.length) return {} as Record<AppRole, RoleMember[]>;

      const userIds = [...new Set(usersWithRoles.map(u => u.user_id))];

      // Get employee profiles for these users in this org
      const { data: profiles, error: profileError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', effectiveOrganization.id)
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Build a map of user_id -> profile
      const profileMap = new Map(
        (profiles || []).map(p => [
          p.user_id,
          {
            user_id: p.user_id,
            display_name: p.display_name || p.full_name || 'Unknown',
            full_name: p.full_name,
            photo_url: p.photo_url,
          },
        ])
      );

      // Build the result grouped by role
      const result: Record<string, RoleMember[]> = {};
      for (const role of roles) {
        result[role] = [];
      }

      for (const ur of usersWithRoles) {
        const profile = profileMap.get(ur.user_id);
        if (profile && roles.includes(ur.role as AppRole)) {
          result[ur.role].push(profile);
        }
      }

      return result as Record<AppRole, RoleMember[]>;
    },
    enabled: !!effectiveOrganization?.id && roles.length > 0,
  });
}
