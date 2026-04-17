import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getReasonLabel } from '@/hooks/useRebookDeclineReasons';

/**
 * useAppointmentDeclinedReasons — bulk-fetch the latest rebook-decline reason
 * per appointment for a list of visible appointment IDs.
 *
 * Returns a Map<appointmentId, { code, label }> so calendar surfaces can
 * render the muted "rebook skipped" dot without N+1 queries.
 *
 * Source: `rebook_decline_reasons` (canonical), not the `appointment_audit_log`
 * mirror — closer to the write, lower drift risk.
 */
export interface AppointmentDeclinedReason {
  code: string;
  label: string;
}

export function useAppointmentDeclinedReasons(appointmentIds: string[]) {
  // Stable cache key — sorted ids prevent thrash on order changes
  const sortedIds = [...appointmentIds].sort();
  const keyHash = sortedIds.join(',');

  return useQuery({
    queryKey: ['appointment-declined-reasons', keyHash],
    queryFn: async (): Promise<Map<string, AppointmentDeclinedReason>> => {
      if (sortedIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('rebook_decline_reasons' as any)
        .select('appointment_id, reason_code, created_at')
        .in('appointment_id', sortedIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useAppointmentDeclinedReasons] query failed', error);
        return new Map();
      }

      // Dedupe — first occurrence per appointment (already sorted DESC by created_at)
      const map = new Map<string, AppointmentDeclinedReason>();
      const rows = (data ?? []) as unknown as Array<{
        appointment_id: string | null;
        reason_code: string;
      }>;
      for (const row of rows) {
        if (!row.appointment_id) continue;
        if (map.has(row.appointment_id)) continue;
        map.set(row.appointment_id, {
          code: row.reason_code,
          label: getReasonLabel(row.reason_code),
        });
      }
      return map;
    },
    enabled: sortedIds.length > 0,
    staleTime: 60_000,
  });
}
