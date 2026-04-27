import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RoleSummary {
  role: AppRole;
  label: string;
  hasOverride: boolean;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
}

/**
 * Roles surfaced on the owner-facing "Team Dashboards" card.
 * Order intentional — most-impacted roles first.
 */
export const TEAM_DASHBOARD_ROLES: { role: AppRole; label: string }[] = [
  { role: 'manager', label: 'Manager' },
  { role: 'stylist', label: 'Stylist' },
  { role: 'receptionist', label: 'Receptionist' },
  { role: 'admin', label: 'Admin' },
  { role: 'bookkeeper', label: 'Bookkeeper' },
];

/**
 * Owner-only summary of org-wide role layouts.
 * For each canonical role, returns whether the org has authored a custom
 * layout and when it was last edited (via the audit table).
 */
export function useTeamDashboardSummary() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();

  return useQuery({
    queryKey: ['team-dashboard-summary', orgId],
    queryFn: async (): Promise<RoleSummary[]> => {
      if (!orgId) return [];

      // Org-authored layouts (presence = "Custom").
      const { data: layouts } = await supabase
        .from('dashboard_role_layouts')
        .select('role')
        .eq('organization_id', orgId);

      const overrideRoles = new Set<string>((layouts || []).map((l) => l.role as string));

      // Latest audit entry per role for the "last edited" timestamp.
      // Single query, ordered desc; we collapse client-side (small N).
      const { data: audit } = await supabase
        .from('dashboard_role_layout_audit')
        .select('role, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200);

      const lastEditedByRole = new Map<string, string>();
      (audit || []).forEach((row) => {
        const r = row.role as string;
        if (!lastEditedByRole.has(r)) lastEditedByRole.set(r, row.created_at as string);
      });

      return TEAM_DASHBOARD_ROLES.map(({ role, label }) => ({
        role,
        label,
        hasOverride: overrideRoles.has(role as string),
        lastEditedAt: lastEditedByRole.get(role as string) ?? null,
        lastEditedBy: null,
      }));
    },
    enabled: !!orgId && !!isPrimaryOwner,
    staleTime: 30 * 1000,
  });
}
