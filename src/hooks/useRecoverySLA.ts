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

export function useRecoverySLA(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const locFilter = locationId && locationId !== 'all' ? locationId : undefined;

  return useQuery({
    queryKey: ['recovery-sla', orgId, locFilter ?? 'all'],
    queryFn: async (): Promise<RecoverySLAStats> => {
      // Aggregate path uses RPC for org-wide; per-location falls back to a
      // direct query against recovery_tasks (location_id is denormalized there).
      if (locFilter) {
        const { data, error } = await supabase
          .from('recovery_tasks')
          .select('status, created_at, first_contacted_at, resolved_at')
          .eq('organization_id', orgId!)
          .eq('location_id', locFilter)
          .limit(5000);
        if (error) throw error;
        const rows = (data ?? []) as Array<{
          status: string;
          created_at: string;
          first_contacted_at: string | null;
          resolved_at: string | null;
        }>;
        const closedSet = new Set(['resolved', 'refunded', 'redo_booked', 'closed']);
        let open = 0, contacted = 0, resolved = 0, breached = 0;
        const fcHrs: number[] = [];
        const resHrs: number[] = [];
        const now = Date.now();
        for (const r of rows) {
          if (r.status === 'new') {
            open += 1;
            if (!r.first_contacted_at && now - new Date(r.created_at).getTime() > 24 * 3_600_000) breached += 1;
          } else if (r.status === 'contacted') {
            contacted += 1;
          } else if (closedSet.has(r.status)) {
            resolved += 1;
          }
          if (r.first_contacted_at) {
            fcHrs.push((new Date(r.first_contacted_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000);
          }
          if (r.resolved_at) {
            resHrs.push((new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000);
          }
        }
        const avg = (xs: number[]) => xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
        return {
          open, contacted, resolved, breachedSLA: breached,
          avgFirstContactHours: avg(fcHrs),
          avgResolutionHours: avg(resHrs),
        };
      }

      const { data, error } = await supabase.rpc('recovery_sla_stats' as any, {
        p_org: orgId,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | {
            open_count: number | null;
            contacted_count: number | null;
            resolved_count: number | null;
            breached_count: number | null;
            avg_first_contact_hours: number | string | null;
            avg_resolution_hours: number | string | null;
          }
        | null
        | undefined;

      const num = (v: number | string | null | undefined): number | null =>
        v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : v;

      return {
        open: row?.open_count ?? 0,
        contacted: row?.contacted_count ?? 0,
        resolved: row?.resolved_count ?? 0,
        avgFirstContactHours: num(row?.avg_first_contact_hours ?? null),
        avgResolutionHours: num(row?.avg_resolution_hours ?? null),
        breachedSLA: row?.breached_count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
