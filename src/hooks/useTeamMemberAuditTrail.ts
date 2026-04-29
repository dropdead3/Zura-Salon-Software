import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AuditEventKind =
  | 'role_added'
  | 'role_removed'
  | 'approved'
  | 'revoked'
  | 'admin_approved'
  | 'admin_revoked'
  | 'super_admin_granted'
  | 'super_admin_revoked'
  | 'other';

export interface AuditEvent {
  id: string;
  kind: AuditEventKind;
  /** For role_added/role_removed, the role slug (e.g. 'stylist', 'admin'). */
  role: string | null;
  /** Human-readable label for the timeline ("Assigned Stylist role", etc.). */
  label: string;
  /** Raw `action` string from account_approval_logs (for debugging / future taxonomy). */
  rawAction: string;
  performedByUserId: string;
  performedByName: string | null;
  performedByPhotoUrl: string | null;
  createdAt: string;
  /**
   * True when this is the chronologically-first `role_added:*` row for the user.
   * Derived at read-time — no SQL view required.
   */
  isInitialAssignment: boolean;
}

function roleLabel(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseAction(action: string): { kind: AuditEventKind; role: string | null; label: string } {
  if (action.startsWith('role_added:')) {
    const role = action.slice('role_added:'.length);
    return { kind: 'role_added', role, label: `Assigned ${roleLabel(role)} role` };
  }
  if (action.startsWith('role_removed:')) {
    const role = action.slice('role_removed:'.length);
    return { kind: 'role_removed', role, label: `Removed ${roleLabel(role)} role` };
  }
  switch (action) {
    case 'approved':
      return { kind: 'approved', role: null, label: 'Account approved' };
    case 'revoked':
      return { kind: 'revoked', role: null, label: 'Account revoked' };
    case 'admin_approved':
      return { kind: 'admin_approved', role: null, label: 'Admin role approved' };
    case 'admin_revoked':
      return { kind: 'admin_revoked', role: null, label: 'Admin role revoked' };
    case 'super_admin_granted':
      return { kind: 'super_admin_granted', role: null, label: 'Super Admin granted' };
    case 'super_admin_revoked':
      return { kind: 'super_admin_revoked', role: null, label: 'Super Admin revoked' };
    default:
      return { kind: 'other', role: null, label: action };
  }
}

/**
 * Reads the per-member audit trail from `account_approval_logs`.
 *
 * We re-use the existing approval-logs table rather than build new infrastructure:
 * `useUserRoles.ts` already writes `role_added:<role>` / `role_removed:<role>`
 * rows there on every role mutation, and RLS already restricts reads to admins.
 *
 * The `role_initial_assignment` event is derived at read-time by flagging
 * the chronologically-first `role_added:*` row per user — no SQL view needed.
 */
export function useTeamMemberAuditTrail(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-member-audit-trail', userId],
    queryFn: async (): Promise<AuditEvent[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('account_approval_logs')
        .select('id, action, performed_by, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      // Resolve actor display info in a single round-trip.
      const performerIds = Array.from(new Set(rows.map((r) => r.performed_by).filter(Boolean)));
      const performerMap = new Map<string, { name: string | null; photo: string | null }>();
      if (performerIds.length > 0) {
        const { data: performers } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', performerIds);
        for (const p of performers ?? []) {
          performerMap.set(p.user_id, {
            name: p.display_name || p.full_name || null,
            photo: p.photo_url ?? null,
          });
        }
      }

      // Find chronologically-first role_added row to flag initial assignment.
      let firstRoleAddedId: string | null = null;
      for (const row of rows) {
        if (row.action.startsWith('role_added:')) {
          firstRoleAddedId = row.id;
          break;
        }
      }

      // Build events; reverse to newest-first for display.
      const events: AuditEvent[] = rows.map((row) => {
        const parsed = parseAction(row.action);
        const performer = performerMap.get(row.performed_by);
        return {
          id: row.id,
          kind: parsed.kind,
          role: parsed.role,
          label: parsed.label,
          rawAction: row.action,
          performedByUserId: row.performed_by,
          performedByName: performer?.name ?? null,
          performedByPhotoUrl: performer?.photo ?? null,
          createdAt: row.created_at,
          isInitialAssignment: row.id === firstRoleAddedId,
        };
      });

      return events.reverse();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
