import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PermissionsAuditEntry {
  staffName: string;
  userId: string;
  roles: string[];
  locationId: string | null;
  isActive: boolean;
}

export function usePermissionsAuditReport(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['permissions-audit-report', orgId, locationId],
    queryFn: async (): Promise<PermissionsAuditEntry[]> => {
      // Get all employee profiles
      const { data: profiles, error: pErr } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, location_id, is_active');
      if (pErr) throw pErr;

      // Get all user roles for this org
      let rolesQuery = supabase.from('user_roles').select('user_id, role');
      if (orgId) rolesQuery = rolesQuery.eq('organization_id', orgId);
      const { data: roles, error: rErr } = await rolesQuery;
      if (rErr) throw rErr;

      // Build role map
      const roleMap = new Map<string, string[]>();
      for (const r of roles || []) {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      }

      const results: PermissionsAuditEntry[] = [];
      for (const p of profiles || []) {
        if (locationId && p.location_id !== locationId) continue;
        const userRoles = roleMap.get(p.user_id) || ['none'];
        results.push({
          staffName: p.display_name || p.full_name || 'Unknown',
          userId: p.user_id,
          roles: userRoles,
          locationId: p.location_id,
          isActive: p.is_active ?? true,
        });
      }

      return results.sort((a, b) => a.staffName.localeCompare(b.staffName));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
