import { useMemo } from 'react';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';

/**
 * Returns whether the current (effective) user has leadership-level access.
 * Leadership = admin, manager, or super_admin.
 */
export function useLeadershipCheck() {
  const roles = useEffectiveRoles();

  const isLeadership = useMemo(
    () =>
      roles.includes('admin') ||
      roles.includes('manager') ||
      roles.includes('super_admin'),
    [roles]
  );

  return { isLeadership, roles };
}
