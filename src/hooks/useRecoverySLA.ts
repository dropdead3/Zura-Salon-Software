import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface RecoverySLAStats {
  open: number;
  contacted: number;
  resolved: number;
  avgFirstContactHours: number | null;
  avgResolutionHours: number | null;
  breachedSLA: number; // open > 24h with no first_contacted_at
}

const SLA_HOURS = 24;
const RESOLVED_STATUSES = ['resolved', 'refunded', 'redo_booked', 'closed'];
// Bounded sample for averages — enough to stabilize the moving average
// without paging through full history as orgs scale to thousands of rows.
const AVG_SAMPLE_LIMIT = 200;

export function useRecoverySLA() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['recovery-sla', orgId],
    queryFn: async (): Promise<RecoverySLAStats> => {
      const nowIso = new Date().toISOString();
      const slaCutoffIso = new Date(Date.now() - SLA_HOURS * 3_600_000).toISOString();

      // Parallel head:true counts — no row payloads. Indexed on
      // (organization_id, status) and (organization_id, snoozed_until).
      // Replaces the prior 500-row scan that grew unboundedly per org.
      const base = () =>
        supabase
          .from('recovery_tasks' as any)
          .select('id', { head: true, count: 'exact' })
          .eq('organization_id', orgId);

      const [openRes, contactedRes, resolvedRes, breachedRes, sampleRes] = await Promise.all([
        base().eq('status', 'new').or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`),
        base().eq('status', 'contacted').or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`),
        base().in('status', RESOLVED_STATUSES),
        base()
          .eq('status', 'new')
          .lt('created_at', slaCutoffIso)
          .is('first_contacted_at', null)
          .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`),
        supabase
          .from('recovery_tasks' as any)
          .select('created_at, first_contacted_at, resolved_at')
          .eq('organization_id', orgId)
          .in('status', RESOLVED_STATUSES)
          .not('resolved_at', 'is', null)
          .order('resolved_at', { ascending: false })
          .limit(AVG_SAMPLE_LIMIT),
      ]);

      if (openRes.error) throw openRes.error;
      if (contactedRes.error) throw contactedRes.error;
      if (resolvedRes.error) throw resolvedRes.error;
      if (breachedRes.error) throw breachedRes.error;
      if (sampleRes.error) throw sampleRes.error;

      const sample = ((sampleRes.data ?? []) as unknown) as Array<{
        created_at: string;
        first_contacted_at: string | null;
        resolved_at: string | null;
      }>;

      const firstContactGaps: number[] = [];
      const resolutionGaps: number[] = [];
      for (const r of sample) {
        const created = new Date(r.created_at).getTime();
        if (r.first_contacted_at) {
          firstContactGaps.push((new Date(r.first_contacted_at).getTime() - created) / 3_600_000);
        }
        if (r.resolved_at) {
          resolutionGaps.push((new Date(r.resolved_at).getTime() - created) / 3_600_000);
        }
      }
      const avg = (xs: number[]) =>
        xs.length === 0 ? null : Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;

      return {
        open: openRes.count ?? 0,
        contacted: contactedRes.count ?? 0,
        resolved: resolvedRes.count ?? 0,
        avgFirstContactHours: avg(firstContactGaps),
        avgResolutionHours: avg(resolutionGaps),
        breachedSLA: breachedRes.count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
