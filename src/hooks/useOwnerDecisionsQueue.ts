import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Owner Decisions Queue.
 *
 * "What needs *me* specifically?" — escalations only, not generic tasks.
 * Returns at most 5 high-leverage items the operator must personally
 * resolve, ordered by oldest pending first.
 *
 * Sources are intentionally pluggable. As new approval surfaces ship
 * (refund_approvals, commission_disputes, employee_offers), add a fetcher
 * here. Visibility-contract compliant: when nothing is pending, returns an
 * empty array and the section suppresses itself.
 *
 * Deferral Register (revisit triggers):
 * - refund_approvals table → wire as second source
 * - commission_disputes table → wire as third source
 * - employee_offers / hiring_pipeline table → wire as fourth source
 */
export type DecisionKind =
  | 'time_off_request'
  | 'refund_approval'
  | 'commission_dispute'
  | 'hire_offer';

export interface OwnerDecision {
  id: string;
  kind: DecisionKind;
  /** Short title rendered in the queue. */
  title: string;
  /** Single-line context (who / when / how much). */
  subtitle: string;
  /** Sortable timestamp — oldest pending first. */
  pendingSince: string;
  /** Where clicking the row should take the operator. */
  href: string;
}

const MAX_DECISIONS = 5;

export function useOwnerDecisionsQueue(args: { enabled: boolean }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['owner-decisions-queue', orgId],
    queryFn: async (): Promise<OwnerDecision[]> => {
      if (!orgId) return [];

      const decisions: OwnerDecision[] = [];

      // ── Source 1: pending time-off requests ─────────────────────────
      const { data: timeOff } = await supabase
        .from('time_off_requests')
        .select('id, user_id, request_type, start_date, end_date, reason, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(MAX_DECISIONS);

      if (timeOff && timeOff.length > 0) {
        // Resolve names in one round-trip.
        const userIds = Array.from(new Set(timeOff.map((r) => r.user_id).filter(Boolean)));
        const { data: profiles } = userIds.length
          ? await supabase
              .from('employee_profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds)
          : { data: [] as Array<{ user_id: string; first_name: string | null; last_name: string | null }> };

        const nameByUser = new Map<string, string>(
          (profiles ?? []).map((p) => [
            p.user_id,
            [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Team member',
          ] as [string, string]),
        );

        for (const r of timeOff) {
          const who = nameByUser.get(r.user_id) ?? 'Team member';
          const span = r.start_date === r.end_date
            ? r.start_date
            : `${r.start_date} → ${r.end_date}`;
          decisions.push({
            id: `time_off:${r.id}`,
            kind: 'time_off_request',
            title: `${who} requested time off`,
            subtitle: `${r.request_type ?? 'time off'} · ${span}`,
            pendingSince: r.created_at ?? new Date().toISOString(),
            href: '/dashboard/admin/team-hub?focus=time-off',
          });
        }
      }

      // Sort oldest first across all sources, then cap.
      decisions.sort(
        (a, b) => new Date(a.pendingSince).getTime() - new Date(b.pendingSince).getTime(),
      );

      return decisions.slice(0, MAX_DECISIONS);
    },
    enabled: args.enabled && !!orgId,
    staleTime: 60 * 1000,
  });
}
