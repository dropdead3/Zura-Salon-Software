import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useOrganizationRoles } from '@/hooks/useOrganizationRoles';
import { templateKeyForRole } from '@/hooks/useDashboardLayout';
import { getRoleBadgeConfig } from '@/lib/roleBadgeConfig';
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
 * One row per *template key group* — collapses roles that share the
 * same dashboard template (e.g. super_admin + admin → 'leadership').
 *
 * `roles`     — every app_role enum value present in the org that resolves
 *               to this template key.
 * `editRole`  — the canonical role to author against. Writes are mirrored to
 *               every role in `roles` to honor the schema's per-role unique
 *               constraint while keeping the UX coherent.
 */
export interface RoleGroupSummary {
  templateKey: string;
  label: string;
  roles: AppRole[];
  editRole: AppRole;
  hasOverride: boolean;
  lastEditedAt: string | null;
}

const TEMPLATE_GROUP_LABELS: Record<string, string> = {
  leadership: 'Leadership',
  manager: 'Manager',
  stylist: 'Stylist',
  assistant: 'Assistant',
  operations: 'Front Desk & Operations',
};

function labelForGroup(templateKey: string, roles: AppRole[]): string {
  const base = TEMPLATE_GROUP_LABELS[templateKey];
  if (base) return base;
  // Fallback: humanize the template key, then suffix with role count if mixed.
  return templateKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Owner-only summary of org-wide role layouts, grouped by template key.
 *
 * Why grouped? `dashboard_role_layouts` is keyed by `(organization_id, role)`
 * but resolution at read time uses `templateKeyForRole()`. Authoring a layout
 * for `admin` while a `super_admin` user is online would silently miss them.
 * The grouped UI makes the collapse explicit; the mirror-write hooks keep
 * every role in the group in sync.
 */
export function useTeamDashboardSummary() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const { data: orgRoles = [] } = useOrganizationRoles();

  return useQuery({
    queryKey: ['team-dashboard-summary', orgId, orgRoles],
    queryFn: async (): Promise<RoleGroupSummary[]> => {
      if (!orgId || orgRoles.length === 0) return [];

      const { data: layouts } = await supabase
        .from('dashboard_role_layouts')
        .select('role, updated_at')
        .eq('organization_id', orgId);

      const overrideByRole = new Map<string, string>(); // role -> updated_at
      (layouts || []).forEach((l) => {
        overrideByRole.set(l.role as string, l.updated_at as string);
      });

      // Group org roles by template key.
      const groups = new Map<string, AppRole[]>();
      for (const role of orgRoles) {
        const key = templateKeyForRole(role);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(role);
      }

      // Build summaries.
      const result: RoleGroupSummary[] = [];
      for (const [templateKey, rolesInGroup] of groups.entries()) {
        // Sort roles inside the group by canonical badge order.
        rolesInGroup.sort(
          (a, b) => getRoleBadgeConfig(a).order - getRoleBadgeConfig(b).order,
        );
        const editRole = rolesInGroup[0];

        // Group has override if ANY role in the group has a stored layout.
        let hasOverride = false;
        let lastEditedAt: string | null = null;
        for (const r of rolesInGroup) {
          const ts = overrideByRole.get(r as string);
          if (ts) {
            hasOverride = true;
            if (!lastEditedAt || ts > lastEditedAt) lastEditedAt = ts;
          }
        }

        result.push({
          templateKey,
          label: labelForGroup(templateKey, rolesInGroup),
          roles: rolesInGroup,
          editRole,
          hasOverride,
          lastEditedAt,
        });
      }

      // Sort groups by the canonical order of their lead (edit) role.
      result.sort(
        (a, b) =>
          getRoleBadgeConfig(a.editRole).order - getRoleBadgeConfig(b.editRole).order,
      );

      return result;
    },
    enabled: !!orgId && !!isPrimaryOwner,
    staleTime: 30 * 1000,
  });
}
