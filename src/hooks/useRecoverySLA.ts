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

export function useRecoverySLA() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['recovery-sla', orgId],
    queryFn: async (): Promise<RecoverySLAStats> => {
      const { data, error } = await supabase
        .from('recovery_tasks' as any)
        .select('status, created_at, first_contacted_at, resolved_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        status: string;
        created_at: string;
        first_contacted_at: string | null;
        resolved_at: string | null;
      }>;

      const now = Date.now();
      let open = 0, contacted = 0, resolved = 0, breachedSLA = 0;
      const firstContactGaps: number[] = [];
      const resolutionGaps: number[] = [];

      for (const r of rows) {
        const created = new Date(r.created_at).getTime();
        if (r.status === 'new') {
          open += 1;
          if ((now - created) / 3_600_000 > SLA_HOURS) breachedSLA += 1;
        } else if (r.status === 'contacted') {
          contacted += 1;
        } else if (['resolved', 'refunded', 'redo_booked', 'closed'].includes(r.status)) {
          resolved += 1;
        }
        if (r.first_contacted_at) {
          firstContactGaps.push((new Date(r.first_contacted_at).getTime() - created) / 3_600_000);
        }
        if (r.resolved_at) {
          resolutionGaps.push((new Date(r.resolved_at).getTime() - created) / 3_600_000);
        }
      }

      const avg = (xs: number[]) => xs.length === 0 ? null : Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;

      return {
        open,
        contacted,
        resolved,
        avgFirstContactHours: avg(firstContactGaps),
        avgResolutionHours: avg(resolutionGaps),
        breachedSLA,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
