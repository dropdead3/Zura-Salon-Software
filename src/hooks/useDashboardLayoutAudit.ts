import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface DashboardLayoutAuditEntry {
  id: string;
  organization_id: string;
  role: AppRole;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  previous_layout: unknown;
  new_layout: unknown;
  created_at: string;
  changed_by_name?: string | null;
}

/**
 * Owner-only audit log of dashboard role layout changes.
 * Returns rows ordered newest-first, optionally scoped to a single role.
 */
export function useDashboardLayoutAudit(role?: AppRole, limit: number = 50) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();

  return useQuery({
    queryKey: ['dashboard-role-layout-audit', orgId, role ?? 'all', limit],
    queryFn: async (): Promise<DashboardLayoutAuditEntry[]> => {
      if (!orgId) return [];

      let q = supabase
        .from('dashboard_role_layout_audit')
        .select('id, organization_id, role, action, changed_by, previous_layout, new_layout, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (role) q = q.eq('role', role);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as DashboardLayoutAuditEntry[];

      // Resolve display names from employee_profiles for the unique editor IDs.
      const editorIds = Array.from(
        new Set(rows.map(r => r.changed_by).filter(Boolean))
      ) as string[];
      if (editorIds.length === 0) return rows;

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', editorIds);

      const nameById = new Map<string, string>();
      (profiles || []).forEach(p => {
        if (p.user_id) {
          nameById.set(p.user_id, p.display_name || p.full_name || 'Unknown');
        }
      });

      return rows.map(r => ({
        ...r,
        changed_by_name: r.changed_by
          ? nameById.get(r.changed_by) || 'Unknown'
          : 'System',
      }));
    },
    enabled: !!orgId && isPrimaryOwner,
    staleTime: 30000,
  });
}
