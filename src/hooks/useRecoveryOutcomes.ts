import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface RecoveryOutcomeRow {
  recovery_task_id: string;
  organization_id: string;
  location_id: string | null;
  client_id: string | null;
  staff_user_id: string | null;
  status: string;
  resolved_at: string;
  task_created_at: string;
  feedback_response_id: string;
  rebook_count: number;
  rebooked: boolean;
  revenue_saved: number;
  first_rebook_at: string | null;
  days_to_rebook: number | null;
}

export interface RecoveryOutcomeSummary {
  totalResolved: number;
  totalRebooked: number;
  rebookRate: number | null; // null if below threshold
  revenueSaved: number;
  avgDaysToRebook: number | null;
  rows: RecoveryOutcomeRow[];
  hasSignal: boolean;
}

const MIN_RESOLVED_FOR_RATE = 5; // signal preservation: suppress rate below 5

/**
 * P3 Recovery outcome tracking — joins resolved recovery tasks to subsequent
 * bookings via v_recovery_outcomes (90-day post-resolution window).
 *
 * Revenue saved feeds Capital/Economics: recovered clients who came back.
 */
export function useRecoveryOutcomes(daysBack = 180) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['recovery-outcomes', orgId, daysBack],
    queryFn: async (): Promise<RecoveryOutcomeSummary> => {
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('v_recovery_outcomes' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .gte('resolved_at', since)
        .order('resolved_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const rows = (data ?? []) as unknown as RecoveryOutcomeRow[];
      const totalResolved = rows.length;
      const rebookedRows = rows.filter(r => r.rebooked);
      const totalRebooked = rebookedRows.length;
      const revenueSaved = rebookedRows.reduce((s, r) => s + Number(r.revenue_saved || 0), 0);
      const daysSamples = rebookedRows
        .map(r => Number(r.days_to_rebook))
        .filter(n => Number.isFinite(n) && n >= 0);
      const avgDaysToRebook = daysSamples.length
        ? daysSamples.reduce((a, b) => a + b, 0) / daysSamples.length
        : null;

      const hasSignal = totalResolved >= MIN_RESOLVED_FOR_RATE;
      const rebookRate = hasSignal ? totalRebooked / totalResolved : null;

      return {
        totalResolved,
        totalRebooked,
        rebookRate,
        revenueSaved,
        avgDaysToRebook,
        rows,
        hasSignal,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
