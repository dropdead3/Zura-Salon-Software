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

export function useRecoverySLA() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['recovery-sla', orgId],
    queryFn: async (): Promise<RecoverySLAStats> => {
      // Single round-trip aggregate — replaces five parallel count queries.
      // Server-side membership check inside the SECURITY DEFINER function
      // prevents cross-org reads even though we pass p_org explicitly.
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
