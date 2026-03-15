import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCoachAssignments } from './useCoachAssignments';

export interface CoachPerformanceRow {
  coachUserId: string;
  coachName: string;
  coachEmail: string;
  coachPhotoUrl: string | null;
  assignedOrgCount: number;
  emailsSent30d: number;
  /** Array of daily waste % values (last 30 days) for sparkline */
  wasteTrend: number[];
  /** Array of daily reweigh % values (last 30 days) for sparkline */
  reweighTrend: number[];
  /** Delta: current avg waste % minus 30-day-ago avg waste % */
  wasteDelta: number | null;
  /** Delta: current avg reweigh % minus 30-day-ago avg reweigh % */
  reweighDelta: number | null;
}

export function useCoachPerformance() {
  const { data: assignments, isLoading: assignmentsLoading } = useCoachAssignments();

  return useQuery({
    queryKey: ['coach-performance', assignments?.map(a => a.coach_user_id).sort().join(',')],
    queryFn: async (): Promise<CoachPerformanceRow[]> => {
      if (!assignments || assignments.length === 0) return [];

      // Group assignments by coach
      const coachMap = new Map<string, { name: string; email: string; photo: string | null; orgIds: string[] }>();
      for (const a of assignments) {
        const existing = coachMap.get(a.coach_user_id);
        if (existing) {
          existing.orgIds.push(a.organization_id);
        } else {
          coachMap.set(a.coach_user_id, {
            name: a.coach_name ?? 'Unknown',
            email: a.coach_email ?? '',
            photo: a.coach_photo_url ?? null,
            orgIds: [a.organization_id],
          });
        }
      }

      const coachIds = [...coachMap.keys()];
      const allOrgIds = [...new Set(assignments.map(a => a.organization_id))];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      // Fetch coaching emails sent (last 30d) from platform_audit_log
      const { data: auditRows } = await supabase
        .from('platform_audit_log')
        .select('user_id')
        .eq('action', 'coaching_email_sent')
        .gte('created_at', thirtyDaysAgo)
        .in('user_id', coachIds);

      const emailCounts = new Map<string, number>();
      for (const row of auditRows || []) {
        emailCounts.set(row.user_id!, (emailCounts.get(row.user_id!) || 0) + 1);
      }

      // Fetch staff_backroom_performance snapshots for assigned orgs (last 30d)
      const { data: perfRows } = await supabase
        .from('staff_backroom_performance')
        .select('organization_id, period_start, waste_rate, reweigh_compliance_rate')
        .in('organization_id', allOrgIds)
        .gte('period_start', thirtyDaysAgo.slice(0, 10))
        .order('period_start', { ascending: true });

      // Group perf by org
      const orgPerf = new Map<string, { waste: number[]; reweigh: number[] }>();
      for (const row of perfRows || []) {
        let entry = orgPerf.get(row.organization_id);
        if (!entry) {
          entry = { waste: [], reweigh: [] };
          orgPerf.set(row.organization_id, entry);
        }
        if (row.waste_rate != null) entry.waste.push(row.waste_rate);
        if (row.reweigh_compliance_rate != null) entry.reweigh.push(row.reweigh_compliance_rate);
      }

      // Build rows
      return coachIds.map(coachId => {
        const info = coachMap.get(coachId)!;
        const wasteTrend: number[] = [];
        const reweighTrend: number[] = [];

        for (const orgId of info.orgIds) {
          const perf = orgPerf.get(orgId);
          if (perf) {
            wasteTrend.push(...perf.waste);
            reweighTrend.push(...perf.reweigh);
          }
        }

        const wasteDelta = wasteTrend.length >= 2
          ? wasteTrend[wasteTrend.length - 1] - wasteTrend[0]
          : null;
        const reweighDelta = reweighTrend.length >= 2
          ? reweighTrend[reweighTrend.length - 1] - reweighTrend[0]
          : null;

        return {
          coachUserId: coachId,
          coachName: info.name,
          coachEmail: info.email,
          coachPhotoUrl: info.photo,
          assignedOrgCount: info.orgIds.length,
          emailsSent30d: emailCounts.get(coachId) || 0,
          wasteTrend,
          reweighTrend,
          wasteDelta,
          reweighDelta,
        };
      });
    },
    enabled: !assignmentsLoading && !!assignments && assignments.length > 0,
    staleTime: 5 * 60_000,
  });
}
