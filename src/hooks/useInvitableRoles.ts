import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleUtils } from './useRoleUtils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

/**
 * Role Invitation Hierarchy
 * 
 * Leadership roles (super_admin, admin, manager) require Super Admin to invite.
 * Operational roles can be invited by Manager or above.
 */

// Leadership roles - Super Admin only can invite these
const LEADERSHIP_ROLES: AppRole[] = ['super_admin', 'admin', 'manager'];

// Admin-invitable roles (Admin can invite these + operational roles)
const ADMIN_INVITABLE_ROLES: AppRole[] = ['admin_assistant', 'bookkeeper'];

// Manager-invitable operational roles
const MANAGER_INVITABLE_ROLES: AppRole[] = [
  'stylist',
  'receptionist',
  'stylist_assistant',
  'operations_assistant',
  'inventory_manager',
];

// All operational/general roles
const GENERAL_ROLES: AppRole[] = [
  ...MANAGER_INVITABLE_ROLES,
  ...ADMIN_INVITABLE_ROLES,
  'booth_renter',
];

// All roles in the system
const ALL_ROLES: AppRole[] = [...LEADERSHIP_ROLES, ...GENERAL_ROLES];

export interface InvitableRolesResult {
  /** Roles the current user can invite */
  invitableRoles: AppRole[];
  /** Whether user can invite any roles */
  canInvite: boolean;
  /** Whether user can invite leadership roles (super_admin, admin, manager) */
  canInviteLeadership: boolean;
  /** Role options formatted for select dropdowns */
  roleOptions: Array<{
    value: AppRole;
    label: string;
    description: string;
    isLeadership: boolean;
  }>;
  /** Check if a specific role can be invited by current user */
  canInviteRole: (role: AppRole) => boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook that determines which roles the current user can invite
 * based on their own role hierarchy.
 * 
 * - Super Admin: Can invite all roles
 * - Admin: Can invite general/operational roles only
 * - Manager: Can invite front-line roles (stylist, receptionist, assistant)
 * - Others: Cannot invite anyone
 */
export function useInvitableRoles(): InvitableRolesResult {
  const { roles: userRoles } = useAuth();
  const { roleOptions: allRoleOptions, isLoading } = useRoleUtils();

  const isSuperAdmin = userRoles.includes('super_admin');
  const isAdmin = userRoles.includes('admin');
  const isManager = userRoles.includes('manager');

  const invitableRoles = useMemo((): AppRole[] => {
    // Super Admin can invite all roles
    if (isSuperAdmin) {
      return ALL_ROLES;
    }

    // Admin can invite general roles (but not leadership)
    if (isAdmin) {
      return GENERAL_ROLES;
    }

    // Manager can invite front-line operational roles only
    if (isManager) {
      return MANAGER_INVITABLE_ROLES;
    }

    // No invitation permissions for other roles
    return [];
  }, [isSuperAdmin, isAdmin, isManager]);

  const canInvite = invitableRoles.length > 0;
  const canInviteLeadership = isSuperAdmin;

  const canInviteRole = (role: AppRole): boolean => {
    return invitableRoles.includes(role);
  };

  // Filter and format role options for dropdowns
  const roleOptions = useMemo(() => {
    return allRoleOptions
      .filter(opt => invitableRoles.includes(opt.value))
      .map(opt => ({
        ...opt,
        isLeadership: LEADERSHIP_ROLES.includes(opt.value),
      }));
  }, [allRoleOptions, invitableRoles]);

  return {
    invitableRoles,
    canInvite,
    canInviteLeadership,
    roleOptions,
    canInviteRole,
    isLoading,
  };
}

// Export constants for external use
export { LEADERSHIP_ROLES, GENERAL_ROLES, ALL_ROLES };
